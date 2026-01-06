package com.nht.core_service.service;

import com.nht.core_service.document.WithdrawalRequest;
import com.nht.core_service.dto.request.CreateWithdrawalRequest;
import com.nht.core_service.dto.response.WithdrawalRequestResponse;
import com.nht.core_service.enums.WithdrawalStatus;

import org.springframework.data.domain.Page;

import java.util.List;

public interface WithdrawalRequestService {
    WithdrawalRequestResponse createWithdrawalRequest(CreateWithdrawalRequest request);
    WithdrawalRequestResponse getWithdrawalRequestById(String id);
    List<WithdrawalRequestResponse> getWithdrawalRequestsByCampaignId(String campaignId);
    void changeWithdrawalRequestStatus(String id);
    
    // New methods for pagination and filtering
    Page<WithdrawalRequestResponse> getWithdrawalsByStatus(WithdrawalStatus status, int page, int size);
    Page<WithdrawalRequestResponse> getAllWithdrawals(int page, int size);
    
    // New methods for approval/rejection
    WithdrawalRequestResponse approveWithdrawal(String id);
    WithdrawalRequestResponse rejectWithdrawal(String id, String reason);
}
