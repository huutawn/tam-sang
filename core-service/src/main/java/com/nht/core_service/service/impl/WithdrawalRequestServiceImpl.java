package com.nht.core_service.service.impl;

import com.mongodb.client.result.UpdateResult;
import com.nht.core_service.config.KafkaTopicConfig;
import com.nht.core_service.document.Campaign;
import com.nht.core_service.document.WithdrawalRequest;
import com.nht.core_service.dto.request.CreateWithdrawalRequest;
import com.nht.core_service.dto.request.FaceVerificationCallbackRequest;
import com.nht.core_service.dto.response.WithdrawalRequestResponse;
import com.nht.core_service.enums.FaceVerificationStatus;
import com.nht.core_service.enums.WithdrawalStatus;
import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;
import com.nht.core_service.kafka.event.FaceVerificationRequestEvent;
import com.nht.core_service.kafka.producer.FaceVerificationProducer;
import com.nht.core_service.repository.mongodb.CampaignRepository;
import com.nht.core_service.repository.mongodb.WithdrawalRequestRepository;
import com.nht.core_service.service.WithdrawalRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalRequestServiceImpl implements WithdrawalRequestService {
    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final CampaignRepository campaignRepository;
    private final MongoTemplate mongoTemplate;
    private final FaceVerificationProducer faceVerificationProducer;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    @Transactional
    public WithdrawalRequestResponse createWithdrawalRequest(CreateWithdrawalRequest request) {
        List<WithdrawalRequest> waitingProofs = withdrawalRequestRepository
                .findByCampaignIdAndStatus(request.campaignId(), WithdrawalStatus.WAITING_PROOF);
        List<WithdrawalRequest> processing = withdrawalRequestRepository.findByCampaignIdAndStatus(request.campaignId(),
                WithdrawalStatus.PROCESSING);
        List<WithdrawalRequest> pendings = withdrawalRequestRepository.findByCampaignIdAndStatus(request.campaignId(),
                WithdrawalStatus.PENDING);

        if (!waitingProofs.isEmpty() || !processing.isEmpty()) {
            throw new AppException(ErrorCode.WITHDRAWAL_ALREADY_APPROVED);
        }

        // Cancel previous pending requests if any
        if (!pendings.isEmpty()) {
            for (WithdrawalRequest pending : pendings) {
                pending.setStatus(WithdrawalStatus.CANCELLED);
                pending.setAiAnalysisResult("Superseded by a newer request");
            }
            withdrawalRequestRepository.saveAll(pendings);
            log.info("Cancelled {} previous pending withdrawal requests for campaign: {}",
                    pendings.size(), request.campaignId());
        }

        if (request.quick()) {
            Query query = new Query(
                    Criteria.where("_id").is(request.campaignId())
                            .and("hasUsedQuickWithdrawal").is(false));
            Update update = new Update()
                    .set("hasUsedQuickWithdrawal", true);
            UpdateResult updateResult = mongoTemplate.updateFirst(query, update, Campaign.class);
            if (updateResult.getModifiedCount() == 0)
                throw new AppException(ErrorCode.QUICK_WITHDRAWAL_ALREADY_USED);
        }

        WithdrawalRequest withdrawalRequest = WithdrawalRequest.builder()
                .campaignId(request.campaignId())
                .amount(request.amount())
                .reason(request.reason())
                .type(request.type())
                .quick(request.quick())
                .selfieImageUrl(request.selfieImageUrl())
                .faceVerificationStatus(FaceVerificationStatus.PENDING)
                .build();
        WithdrawalRequest saved = withdrawalRequestRepository.save(withdrawalRequest);

        // Send face verification event to AI service
        // We need the campaign owner's KYC image — get from campaign
        Campaign campaign = campaignRepository.findById(request.campaignId())
                .orElseThrow(() -> new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));

        FaceVerificationRequestEvent event = new FaceVerificationRequestEvent(
                saved.getId(),
                campaign.getOwnerId(),
                request.selfieImageUrl(),
                null // kycImageUrl will be resolved by AI service via identity-service API
        );
        faceVerificationProducer.sendFaceVerificationRequest(event);
        log.info("Face verification event sent for withdrawal: {}", saved.getId());

        return toWithdrawalRequestResponse(saved);
    }

    @Override
    public WithdrawalRequestResponse getWithdrawalRequestById(String id) {
        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));
        return toWithdrawalRequestResponse(withdrawalRequest);
    }

    private WithdrawalRequestResponse toWithdrawalRequestResponse(WithdrawalRequest withdrawalRequest) {
        return new WithdrawalRequestResponse(
                withdrawalRequest.getId(),
                withdrawalRequest.getCampaignId(),
                withdrawalRequest.getAmount(),
                withdrawalRequest.getReason(),
                withdrawalRequest.getBankAccount(),
                withdrawalRequest.getType(),
                withdrawalRequest.getQuick(),
                withdrawalRequest.getAiAnalysisResult(),
                withdrawalRequest.getSelfieImageUrl(),
                withdrawalRequest.getFaceVerificationStatus(),
                withdrawalRequest.getFaceVerificationLog(),
                withdrawalRequest.getStatus(),
                withdrawalRequest.getCreatedAt());
    }

    @Override
    public List<WithdrawalRequestResponse> getWithdrawalsByCampaignId(String campaignId, String status) {
        if (status == null) {
            List<WithdrawalRequest> withdrawalRequests = withdrawalRequestRepository
                    .findByCampaignIdOrderByCreatedAtDesc(campaignId);
            return withdrawalRequests.stream().map(this::toWithdrawalRequestResponse).toList();
        }
        List<WithdrawalRequest> withdrawalRequests = withdrawalRequestRepository.findByCampaignIdAndStatus(campaignId,
                WithdrawalStatus.valueOf(status));
        return withdrawalRequests.stream().map(this::toWithdrawalRequestResponse).toList();
    }

    @Override
    public void changeWithdrawalRequestStatus(String id) {
        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));
        withdrawalRequest.setStatus(WithdrawalStatus.APPROVED);
        withdrawalRequestRepository.save(withdrawalRequest);
    }

    @Override
    public Page<WithdrawalRequestResponse> getWithdrawalsByStatus(WithdrawalStatus status, int page, int size) {
        log.info("Getting withdrawals by status: {} (page: {}, size: {})", status, page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<WithdrawalRequest> withdrawals = withdrawalRequestRepository.findByStatus(status, pageable);
        return withdrawals.map(this::toWithdrawalRequestResponse);
    }

    @Override
    public Page<WithdrawalRequestResponse> getAllWithdrawals(int page, int size) {
        log.info("Getting all withdrawals (page: {}, size: {})", page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<WithdrawalRequest> withdrawals = withdrawalRequestRepository.findAll(pageable);
        return withdrawals.map(this::toWithdrawalRequestResponse);
    }

    @Override
    public Page<WithdrawalRequestResponse> getWithdrawalsForAdmin(FaceVerificationStatus faceStatus, int page,
            int size) {
        log.info("Getting withdrawals for admin - faceStatus: {}, page: {}, size: {}", faceStatus, page, size);
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.ASC, "faceVerificationStatus")
                        .and(Sort.by(Sort.Direction.DESC, "createdAt")));
        if (faceStatus != null) {
            return withdrawalRequestRepository.findByFaceVerificationStatus(faceStatus, pageable)
                    .map(this::toWithdrawalRequestResponse);
        }
        return withdrawalRequestRepository.findAll(pageable)
                .map(this::toWithdrawalRequestResponse);
    }

    @Override
    public WithdrawalRequestResponse approveWithdrawal(String id) {
        log.info("Approving withdrawal request: {}", id);
        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));

        if (withdrawalRequest.getStatus() != WithdrawalStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_STATUS);
        }

        withdrawalRequest.setStatus(WithdrawalStatus.WAITING_PROOF);
        WithdrawalRequest saved = withdrawalRequestRepository.save(withdrawalRequest);

        // Publish withdrawal event to blockchain-service
        try {
            Map<String, Object> event = Map.of(
                    "withdrawalId", id,
                    "campaignId", withdrawalRequest.getCampaignId(),
                    "amount", withdrawalRequest.getAmount(),
                    "reason", withdrawalRequest.getReason() != null ? withdrawalRequest.getReason() : "",
                    "type", withdrawalRequest.getType().name());
            kafkaTemplate.send(KafkaTopicConfig.WITHDRAWAL_EVENTS_TOPIC, id, event);
            log.info("Published withdrawal event to Kafka: withdrawalId={}", id);
        } catch (Exception e) {
            log.error("Failed to publish withdrawal event to Kafka for withdrawalId={}", id, e);
        }

        log.info("Withdrawal request approved and set to WAITING_PROOF: {}", id);

        return toWithdrawalRequestResponse(saved);
    }

    @Override
    public WithdrawalRequestResponse rejectWithdrawal(String id, String reason) {
        log.info("Rejecting withdrawal request: {} with reason: {}", id, reason);
        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));

        if (withdrawalRequest.getStatus() != WithdrawalStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_STATUS);
        }

        withdrawalRequest.setStatus(WithdrawalStatus.REJECTED);
        withdrawalRequest.setAiAnalysisResult(reason);
        WithdrawalRequest saved = withdrawalRequestRepository.save(withdrawalRequest);

        log.info("Withdrawal request rejected: {}", id);

        return toWithdrawalRequestResponse(saved);
    }

    @Override
    public void updateFaceVerificationResult(FaceVerificationCallbackRequest request) {
        log.info("Updating face verification result for withdrawal: {}", request.withdrawalId());

        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(request.withdrawalId())
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));

        // Map status string to enum
        FaceVerificationStatus faceStatus;
        try {
            faceStatus = FaceVerificationStatus.valueOf(request.status());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown face verification status: {}, defaulting to WARNING", request.status());
            faceStatus = FaceVerificationStatus.WARNING;
        }

        withdrawalRequest.setFaceVerificationStatus(faceStatus);
        withdrawalRequest.setFaceVerificationLog(request.analysisLog());

        withdrawalRequestRepository.save(withdrawalRequest);
        log.info("Face verification updated for withdrawal: {} -> status: {}, score: {}",
                request.withdrawalId(), faceStatus, request.score());
    }

    @Override
    public void completeWithdrawalTransaction(com.nht.core_service.dto.request.WithdrawalCompleteRequest request) {
        log.info("Completing withdrawal from blockchain callback for withdrawalId: {}", request.withdrawalId());

        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(request.withdrawalId())
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));

        // Update campaign usedAmount atomically
        try {
            Query query = new Query(Criteria.where("id").is(withdrawalRequest.getCampaignId()));
            Update update = new Update().inc("usedAmount", request.amount().doubleValue());
            mongoTemplate.updateFirst(query, update, Campaign.class);
            log.info("Updated campaign usedAmount from blockchain callback: campaignId={}, amount={}",
                    withdrawalRequest.getCampaignId(), request.amount());
        } catch (Exception e) {
            log.error("Failed to update campaign usedAmount from callback for campaignId={}",
                    withdrawalRequest.getCampaignId(), e);
        }
    }
}
