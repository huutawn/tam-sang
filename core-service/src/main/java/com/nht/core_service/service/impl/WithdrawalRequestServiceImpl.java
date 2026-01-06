package com.nht.core_service.service.impl;

import com.nht.core_service.document.Campaign;
import com.nht.core_service.document.WithdrawalRequest;
import com.nht.core_service.dto.request.CreateWithdrawalRequest;
import com.nht.core_service.dto.response.WithdrawalRequestResponse;
import com.nht.core_service.enums.WithdrawalStatus;
import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;
import com.nht.core_service.repository.mongodb.CampaignRepository;
import com.nht.core_service.repository.mongodb.WithdrawalRequestRepository;
import com.nht.core_service.service.WithdrawalRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalRequestServiceImpl implements WithdrawalRequestService {
    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final CampaignRepository campaignRepository;
    @Override
    public WithdrawalRequestResponse createWithdrawalRequest(CreateWithdrawalRequest request) {
        List<WithdrawalRequest> withdrawalRequests = withdrawalRequestRepository.findByCampaignIdAndStatus(request.campaignId(), WithdrawalStatus.APPROVED);
        if(!withdrawalRequests.isEmpty()&&!request.quick()){
            throw new AppException(ErrorCode.WITHDRAWAL_BLOCKED_WAITING_PROOF);
        }
        if(request.quick()==true){
            Campaign campaign = campaignRepository.findById(request.campaignId())
                    .orElseThrow(()->new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));
            if(campaign.getHasUsedQuickWithdrawal()){
                throw new AppException(ErrorCode.QUICK_WITHDRAWAL_ALREADY_USED);
            }
            campaign.setHasUsedQuickWithdrawal(true);
            campaignRepository.save(campaign);
            WithdrawalRequest withdrawalRequest = WithdrawalRequest.builder()
                    .campaignId(request.campaignId())
                    .amount(request.amount())
                    .reason(request.reason())
                    .type(request.type())
                    .quick(request.quick())
                    .build();
            WithdrawalRequest saved = withdrawalRequestRepository.save(withdrawalRequest);
            return toWithdrawalRequestResponse(saved);
        }else{
            WithdrawalRequest withdrawalRequest = WithdrawalRequest.builder()
                    .campaignId(request.campaignId())
                    .amount(request.amount())
                    .reason(request.reason())
                    .type(request.type())
                    .quick(request.quick())
                    .build();
            WithdrawalRequest saved = withdrawalRequestRepository.save(withdrawalRequest);
            return toWithdrawalRequestResponse(saved);
        }
    }

    @Override
    public WithdrawalRequestResponse getWithdrawalRequestById(String id) {
        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(id)
                .orElseThrow(()->new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));
        return toWithdrawalRequestResponse(withdrawalRequest);
    }
    private WithdrawalRequestResponse toWithdrawalRequestResponse(WithdrawalRequest withdrawalRequest){
        return new WithdrawalRequestResponse(
                withdrawalRequest.getId(),
                withdrawalRequest.getCampaignId(),
                withdrawalRequest.getAmount(),
                withdrawalRequest.getReason(),
                withdrawalRequest.getBankAccount(),
                withdrawalRequest.getType(),
                withdrawalRequest.getQuick(),
                withdrawalRequest.getAiAnalysisResult(),
                withdrawalRequest.getStatus(),
                withdrawalRequest.getCreatedAt()
        );
    }

    @Override
    public List<WithdrawalRequestResponse> getWithdrawalRequestsByCampaignId(String campaignId) {
        List<WithdrawalRequest> withdrawalRequests = withdrawalRequestRepository.findByCampaignIdAndStatus(campaignId, WithdrawalStatus.APPROVED);
        return withdrawalRequests.stream().map(this::toWithdrawalRequestResponse).toList();
    }

    @Override
    public void changeWithdrawalRequestStatus(String id) {
        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(id)
                .orElseThrow(()->new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));
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
    public WithdrawalRequestResponse approveWithdrawal(String id) {
        log.info("Approving withdrawal request: {}", id);
        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(id)
                .orElseThrow(()->new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));
        
        if (withdrawalRequest.getStatus() != WithdrawalStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_STATUS);
        }
        
        withdrawalRequest.setStatus(WithdrawalStatus.WAITING_PROOF);
        WithdrawalRequest saved = withdrawalRequestRepository.save(withdrawalRequest);
        
        // TODO: Trigger transaction to wallet (future feature)
        log.info("Withdrawal request approved and set to WAITING_PROOF: {}", id);
        
        return toWithdrawalRequestResponse(saved);
    }
    
    @Override
    public WithdrawalRequestResponse rejectWithdrawal(String id, String reason) {
        log.info("Rejecting withdrawal request: {} with reason: {}", id, reason);
        WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(id)
                .orElseThrow(()->new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));
        
        if (withdrawalRequest.getStatus() != WithdrawalStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_STATUS);
        }
        
        withdrawalRequest.setStatus(WithdrawalStatus.REJECTED);
        withdrawalRequest.setAiAnalysisResult(reason);  // Store rejection reason
        WithdrawalRequest saved = withdrawalRequestRepository.save(withdrawalRequest);
        
        log.info("Withdrawal request rejected: {}", id);
        
        return toWithdrawalRequestResponse(saved);
    }
}
