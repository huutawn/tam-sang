 package com.nht.core_service.service.impl;

import com.nht.core_service.dto.response.CampaignPageResponse;
import com.nht.core_service.dto.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nht.core_service.document.Campaign;
import com.nht.core_service.dto.request.CreateCampaignRequest;
import com.nht.core_service.dto.response.CampaignResponse;
import com.nht.core_service.entity.Wallet;
import com.nht.core_service.enums.CampaignStatus;
import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;
import com.nht.core_service.repository.mongodb.CampaignRepository;
import com.nht.core_service.service.CampaignService;
import com.nht.core_service.service.TransactionErrorService;
import com.nht.core_service.service.WalletService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.util.List;

 @Service
@RequiredArgsConstructor
@Slf4j
public class CampaignServiceImpl implements CampaignService {

	private final CampaignRepository campaignRepository;
	private final WalletService walletService;
	private final TransactionErrorService transactionErrorService;

	@Override
	@Transactional
	public Campaign createCampaign(CreateCampaignRequest request) {
		log.info("Creating campaign: {}", request.title());

		// Step 1: Create Campaign in MongoDB
		Campaign campaign = Campaign.builder()
				.title(request.title())
				.content(request.content())
				.targetAmount(request.targetAmount())
				.currentAmount(java.math.BigDecimal.ZERO)
				.images(request.images())
				.usedAmount(BigDecimal.ZERO)
				.status(CampaignStatus.DRAFT)
				.startDate(request.startDate())
				.endDate(request.endDate())
				.ownerId(request.ownerId())
				.hasUsedQuickWithdrawal(false)
				.likeCount(0L)
				.viewCount(0L)
				.commentCount(0L)
				.build();

		Campaign savedCampaign = campaignRepository.save(campaign);
		log.info("Campaign created in MongoDB: {}", savedCampaign.getId());

		try {
			// Step 2: Create Wallet in PostgreSQL 
			walletService.createWallet(savedCampaign.getId());
			log.info("Wallet created successfully for campaign: {}", savedCampaign.getId());

			return savedCampaign;

		} catch (Exception e) {
			// Delete Campaign from MongoDB
			log.error("Wallet creation failed, rolling back campaign: {}", savedCampaign.getId(), e);
			campaignRepository.deleteById(savedCampaign.getId());

			// Log error for monitoring
			transactionErrorService.logError(
					savedCampaign.getId(), request.targetAmount(), "Campaign creation failed: " + e.getMessage());

			throw new AppException(ErrorCode.CAMPAIGN_CREATION_FAILED);
		}
	}

	@Override
	public CampaignResponse getCampaignById(String id) {
		Campaign campaign =
				campaignRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));

		Wallet wallet = walletService.getWalletByCampaignId(id);

		return new CampaignResponse(
				campaign.getId(),
				campaign.getTitle(),
				campaign.getContent(),
				campaign.getTargetAmount(),
				campaign.getCurrentAmount(),
				wallet.getBalance(),
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
	public PageResponse<CampaignPageResponse> getCampaigns(int size, int page){
		Sort sort = Sort.by(Sort.Direction.DESC,"createdAt");
		Pageable pageable = PageRequest.of(page-1,size,sort);
		Page<Campaign> campaigns = campaignRepository.findAll(pageable);
		List<CampaignPageResponse> campaignResponses =campaigns.getContent().stream().map(this::toCampaignResponse).toList();
		return new PageResponse<>(page,campaigns.getTotalPages(),pageable.getPageSize(),campaigns.getTotalElements(),campaignResponses);
	}
	@Override
	@Transactional
	public void closeCampaign(String id) {
		Campaign campaign =
				campaignRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));

		if (campaign.getStatus() == CampaignStatus.CLOSED) {
			throw new AppException(ErrorCode.CAMPAIGN_ALREADY_CLOSED);
		}

		// Update campaign status
		campaign.setStatus(CampaignStatus.CLOSED);
		campaignRepository.save(campaign);

		// Lock the associated wallet
		Wallet wallet = walletService.getWalletByCampaignId(id);
		walletService.lockWallet(wallet.getId());

		log.info("Campaign closed and wallet locked: {}", id);
	}
	private CampaignPageResponse toCampaignResponse(Campaign campaign){
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
				campaign.getCommentCount()
		);
	}
}
