package com.nht.core_service.service.impl;

import com.nht.core_service.client.BlockchainServiceClient;
import com.nht.core_service.client.IdentityServiceClient;
import com.nht.core_service.client.dto.CreateWalletRequest;
import com.nht.core_service.client.dto.KycProfileResponse;
import com.nht.core_service.client.dto.ValidKycResponse;
import com.nht.core_service.client.dto.WalletResponse;
import com.nht.core_service.dto.response.ApiResponse;
import com.nht.core_service.dto.response.CampaignPageResponse;
import com.nht.core_service.dto.response.PageResponse;
import com.nht.core_service.kafka.producer.ContractEventProducer;
import com.nht.core_service.utils.JwtUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nht.core_service.document.Campaign;
import com.nht.core_service.dto.request.CreateCampaignRequest;
import com.nht.core_service.dto.response.CampaignResponse;
import com.nht.core_service.enums.CampaignStatus;
import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;
import com.nht.core_service.repository.mongodb.CampaignRepository;
import com.nht.core_service.service.CampaignService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignServiceImpl implements CampaignService {

	private final CampaignRepository campaignRepository;
	private final BlockchainServiceClient blockchainServiceClient;
	private final IdentityServiceClient identityServiceClient;
	private final ContractEventProducer contractEventProducer;

	@Override
	@Transactional
	public Campaign createCampaign(CreateCampaignRequest request) {
		log.info("Creating campaign: {}", request.title());

		String userId = JwtUtils.getUserIdFromToken();
		
		// Step 1: Validate KYC status
		KycProfileResponse kycProfile = validateKycAndGetProfile(userId);
		log.info("KYC validated for user: {}", userId);

		// Step 2: Create Campaign in MongoDB with status PENDING
		Campaign campaign = Campaign.builder()
				.title(request.title())
				.content(request.content())
				.targetAmount(request.targetAmount())
				.currentAmount(BigDecimal.ZERO)
				.images(request.images())
				.usedAmount(BigDecimal.ZERO)
				.status(CampaignStatus.PENDING) // Start with PENDING
				.startDate(LocalDateTime.now())
				.endDate(LocalDateTime.now().plusDays(59))
				.ownerId(userId)
				.hasUsedQuickWithdrawal(false)
				.likeCount(0L)
				.viewCount(0L)
				.commentCount(0L)
				.build();

		Campaign savedCampaign = campaignRepository.save(campaign);
		log.info("Campaign created in MongoDB with PENDING status: {}", savedCampaign.getId());

		// Step 3: Create Wallet in blockchain-service (Saga Pattern)
		WalletResponse walletResponse = createWalletWithRollback(savedCampaign.getId());
		log.info("Wallet created in blockchain-service: walletId={}, campaignId={}", 
				walletResponse.id(), savedCampaign.getId());

		// Step 4: Update Campaign status to ACTIVE
		savedCampaign.setStatus(CampaignStatus.ACTIVE);
		campaignRepository.save(savedCampaign);
		log.info("Campaign status updated to ACTIVE: {}", savedCampaign.getId());

		// Step 5: Fire Kafka event to create contract
		try {
			contractEventProducer.publishContractSignRequest(
					savedCampaign.getId(),
					savedCampaign.getTitle(),
					savedCampaign.getContent(),
					savedCampaign.getTargetAmount(),
					"VND",
					savedCampaign.getStartDate().toLocalDate(),
					savedCampaign.getEndDate().toLocalDate(),
					userId,
					kycProfile.fullName(),
					kycProfile.idNumber()
			);
			log.info("Contract sign request published to Kafka for campaign: {}", savedCampaign.getId());
		} catch (Exception e) {
			// Log but don't fail - contract creation is async
			log.error("Failed to publish contract sign request: {}", e.getMessage());
		}

		return savedCampaign;
	}

	/**
	 * Validates KYC status and returns KYC profile for contract creation.
	 * Throws exception if KYC is not verified.
	 */
	private KycProfileResponse validateKycAndGetProfile(String userId) {
		try {
			// Check if KYC is valid
			ApiResponse<ValidKycResponse> kycValidation = identityServiceClient.validateKyc(userId);
			
			if (kycValidation.code() != 1000 || kycValidation.result() == null) {
				log.error("KYC validation failed: code={}", kycValidation.code());
				throw new AppException(ErrorCode.KYC_VALIDATION_FAILED);
			}

			ValidKycResponse validKyc = kycValidation.result();
			log.info("kyc valid: {}", validKyc.isValid());
			if (validKyc.isValid()==false) {
				log.warn("KYC not verified for user: {}, status: {}, message: {}", 
						userId, validKyc.status(), validKyc.message());
				throw new AppException(ErrorCode.KYC_NOT_VERIFIED);
			}

			// Get KYC profile for contract
			ApiResponse<KycProfileResponse> profileResponse = identityServiceClient.getKycProfileByUserId(userId);
			
			if (profileResponse.code() != 1000 || profileResponse.result() == null) {
				log.error("Failed to get KYC profile: code={}", profileResponse.code());
				throw new AppException(ErrorCode.KYC_VALIDATION_FAILED);
			}

			return profileResponse.result();
		} catch (AppException e) {
			throw e;
		} catch (Exception e) {
			log.error("Error validating KYC for user: {}", userId, e);
			throw new AppException(ErrorCode.KYC_VALIDATION_FAILED);
		}
	}

	/**
	 * Creates wallet in blockchain-service with saga rollback on failure.
	 */
	private WalletResponse createWalletWithRollback(String campaignId) {
		try {
			CreateWalletRequest walletRequest = new CreateWalletRequest(campaignId);
			ApiResponse<WalletResponse> response = blockchainServiceClient.createWallet(walletRequest);

			if (response.code() != 1000 || response.result() == null) {
				log.error("Wallet creation failed: code={}, message={}", response.code(), response.message());
				// Rollback: delete campaign
				rollbackCampaign(campaignId, "Wallet creation returned code: " + response.code());
				throw new AppException(ErrorCode.WALLET_CREATION_FAILED);
			}

			return response.result();
		} catch (AppException e) {
			throw e;
		} catch (Exception e) {
			log.error("Exception during wallet creation for campaign: {}", campaignId, e);
			// Rollback: delete campaign
			rollbackCampaign(campaignId, e.getMessage());
			throw new AppException(ErrorCode.WALLET_CREATION_FAILED);
		}
	}

	/**
	 * Rollback campaign by deleting it from MongoDB.
	 */
	private void rollbackCampaign(String campaignId, String reason) {
		try {
			log.warn("Rolling back campaign: {} due to: {}", campaignId, reason);
			campaignRepository.deleteById(campaignId);
			log.info("Campaign rollback completed: {}", campaignId);
		} catch (Exception e) {
			log.error("Failed to rollback campaign: {}", campaignId, e);
		}
	}

	@Override
	public CampaignResponse getCampaignById(String id) {
		Campaign campaign = campaignRepository.findById(id)
				.orElseThrow(() -> new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));

		// Get wallet balance from blockchain-service
		BigDecimal walletBalance = BigDecimal.ZERO;
		try {
			ApiResponse<WalletResponse> walletResponse = blockchainServiceClient.getWalletByCampaign(id);
			if (walletResponse.code() == 1000 && walletResponse.result() != null) {
				walletBalance = walletResponse.result().balance();
			}
		} catch (Exception e) {
			log.warn("Failed to get wallet balance for campaign: {}", id, e);
		}

		return new CampaignResponse(
				campaign.getId(),
				campaign.getTitle(),
				campaign.getContent(),
				campaign.getTargetAmount(),
				campaign.getCurrentAmount(),
				walletBalance,
				campaign.getImages(),
				campaign.getStatus(),
				campaign.getStartDate(),
				campaign.getEndDate(),
				campaign.getOwnerId(),
				campaign.getHasUsedQuickWithdrawal(),
				campaign.getLikeCount(),
				campaign.getViewCount(),
				campaign.getCommentCount());
	}

	@Override
	public PageResponse<CampaignPageResponse> getCampaigns(int size, int page) {
		Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
		Pageable pageable = PageRequest.of(page - 1, size, sort);
		Page<Campaign> campaigns = campaignRepository.findAll(pageable);
		List<CampaignPageResponse> campaignResponses = campaigns.getContent().stream()
				.map(this::toCampaignResponse).toList();
		return new PageResponse<>(page, campaigns.getTotalPages(), pageable.getPageSize(),
				campaigns.getTotalElements(), campaignResponses);
	}

	@Override
	public PageResponse<CampaignPageResponse> getMyCampaigns(int size, int page) {
		String userId = JwtUtils.getUserIdFromToken();
		Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
		Pageable pageable = PageRequest.of(page - 1, size, sort);
		Page<Campaign> campaigns = campaignRepository.findByOwnerId(userId, pageable);
		List<CampaignPageResponse> campaignResponses = campaigns.getContent().stream()
				.map(this::toCampaignResponse).toList();
		return new PageResponse<>(page, campaigns.getTotalPages(), pageable.getPageSize(),
				campaigns.getTotalElements(), campaignResponses);
	}

	@Override
	@Transactional
	public void closeCampaign(String id) {
		Campaign campaign = campaignRepository.findById(id)
				.orElseThrow(() -> new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));

		if (campaign.getStatus() == CampaignStatus.CLOSED) {
			throw new AppException(ErrorCode.CAMPAIGN_ALREADY_CLOSED);
		}

		// Save previous status for rollback
		CampaignStatus previousStatus = campaign.getStatus();

		// Update campaign status
		campaign.setStatus(CampaignStatus.CLOSED);
		campaignRepository.save(campaign);

		// Freeze the wallet in blockchain-service
		try {
			ApiResponse<WalletResponse> walletResponse = blockchainServiceClient.getWalletByCampaign(id);
			if (walletResponse.code() == 1000 && walletResponse.result() != null) {
				blockchainServiceClient.freezeWallet(walletResponse.result().id());
				log.info("Wallet frozen for campaign: {}", id);
			} else {
				log.warn("Could not find wallet for campaign: {}, code={}", id, walletResponse.code());
			}
		} catch (Exception e) {
			// Rollback campaign status — wallet is still active, can't leave campaign CLOSED
			log.error("Failed to freeze wallet for campaign: {}, rolling back status to {}", id, previousStatus, e);
			campaign.setStatus(previousStatus);
			campaignRepository.save(campaign);
			throw new AppException(ErrorCode.CAMPAIGN_CLOSE_FAILED);
		}

		log.info("Campaign closed: {}", id);
	}

	private CampaignPageResponse toCampaignResponse(Campaign campaign) {
		return new CampaignPageResponse(
				campaign.getId(),
				campaign.getTitle(),
				campaign.getContent(),
				campaign.getTargetAmount(),
				campaign.getCurrentAmount(),
				campaign.getUsedAmount(),
				campaign.getImages(),
				campaign.getStatus(),
				campaign.getStartDate(),
				campaign.getEndDate(),
				campaign.getOwnerId(),
				campaign.getHasUsedQuickWithdrawal(),
				campaign.getLikeCount(),
				campaign.getViewCount(),
				campaign.getCommentCount());
	}
}
