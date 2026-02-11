package com.nht.core_service.service;

import java.util.List;

import org.springframework.data.domain.Page;

import com.nht.core_service.dto.request.HybridReasoningCallbackRequest;
import com.nht.core_service.dto.response.ProofResponse;
import com.nht.core_service.kafka.event.ProofVerificationResultEvent;

public interface ProofService {
	
	ProofResponse uploadProof(String withdrawalRequestId, String imageUrl, String description);
	
	ProofResponse getProofById(String id);
	
	List<ProofResponse> getProofsByWithdrawalId(String withdrawalRequestId);
	
	void updateProofFromAiResult(ProofVerificationResultEvent event);
	
	void updateProofFromHybridResult(HybridReasoningCallbackRequest request);
}
