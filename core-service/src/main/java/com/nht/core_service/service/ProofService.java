package com.nht.core_service.service;

import java.util.List;

import org.springframework.data.domain.Page;

import com.nht.core_service.dto.request.HybridReasoningCallbackRequest;
import com.nht.core_service.dto.response.ProofResponse;
import com.nht.core_service.enums.AiStatus;
import com.nht.core_service.kafka.event.ProofVerificationResultEvent;

public interface ProofService {

	ProofResponse uploadProof(String withdrawalRequestId, List<String> billImageUrls, List<String> sceneImageUrls,
			String description);

	ProofResponse getProofById(String id);

	List<ProofResponse> getProofsByWithdrawalId(String withdrawalRequestId);

	void updateProofFromAiResult(ProofVerificationResultEvent event);

	void updateProofFromHybridResult(HybridReasoningCallbackRequest request);

	// Admin: paginated proofs with optional aiStatus filter
	Page<ProofResponse> getProofsForAdmin(AiStatus aiStatus, int page, int size);

	ProofResponse approveProof(String id);

	ProofResponse rejectProof(String id);

	ProofResponse upvoteProof(String id, String userId);

	ProofResponse reportProof(String id, String userId);
}
