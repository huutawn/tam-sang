package com.nht.core_service.service;

import com.nht.core_service.dto.request.CreateWithdrawalRequest;
import com.nht.core_service.dto.request.FaceVerificationCallbackRequest;
import com.nht.core_service.dto.response.WithdrawalRequestResponse;
import com.nht.core_service.enums.FaceVerificationStatus;
import com.nht.core_service.enums.WithdrawalStatus;

import org.springframework.data.domain.Page;

import java.util.List;

public interface WithdrawalRequestService {
    WithdrawalRequestResponse createWithdrawalRequest(CreateWithdrawalRequest request);
    WithdrawalRequestResponse getWithdrawalRequestById(String id);
    List<WithdrawalRequestResponse> getWithdrawalsByCampaignId(String campaignId, String status);
    void changeWithdrawalRequestStatus(String id);
    
    // Pagination and filtering
    Page<WithdrawalRequestResponse> getWithdrawalsByStatus(WithdrawalStatus status, int page, int size);
    Page<WithdrawalRequestResponse> getAllWithdrawals(int page, int size);
    
    // Admin: filter by face verification status
    Page<WithdrawalRequestResponse> getWithdrawalsForAdmin(FaceVerificationStatus faceStatus, int page, int size);
    
    // Approval/rejection
    WithdrawalRequestResponse approveWithdrawal(String id);
    WithdrawalRequestResponse rejectWithdrawal(String id, String reason);
    
    // Face verification callback
    void updateFaceVerificationResult(FaceVerificationCallbackRequest request);
}
