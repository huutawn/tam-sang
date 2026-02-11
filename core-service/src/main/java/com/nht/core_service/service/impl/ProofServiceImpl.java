package com.nht.core_service.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.nht.core_service.document.Campaign;
import com.nht.core_service.document.Proof;
import com.nht.core_service.document.WithdrawalRequest;
import com.nht.core_service.dto.request.HybridReasoningCallbackRequest;
import com.nht.core_service.dto.response.ProofResponse;
import com.nht.core_service.enums.AiStatus;
import com.nht.core_service.enums.WithdrawalStatus;
import com.nht.core_service.enums.WithdrawalType;
import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;
import com.nht.core_service.kafka.event.HybridReasoningRequestEvent;
import com.nht.core_service.kafka.event.ProofVerificationRequestEvent;
import com.nht.core_service.kafka.event.ProofVerificationResultEvent;
import com.nht.core_service.kafka.producer.HybridReasoningProducer;
import com.nht.core_service.kafka.producer.ProofKafkaProducer;
import com.nht.core_service.repository.mongodb.CampaignRepository;
import com.nht.core_service.repository.mongodb.ProofRepository;
import com.nht.core_service.repository.mongodb.WithdrawalRequestRepository;
import com.nht.core_service.service.ProofService;
import com.nht.core_service.service.WebSocketService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProofServiceImpl implements ProofService {
	
	private final ProofRepository proofRepository;
	private final WithdrawalRequestRepository withdrawalRequestRepository;
	private final CampaignRepository campaignRepository;
	private final ProofKafkaProducer proofKafkaProducer;
	private final HybridReasoningProducer hybridReasoningProducer;
	private final WebSocketService webSocketService;
	
	@Override
	public ProofResponse uploadProof(String withdrawalRequestId, String imageUrl, String description) {
		log.info("Uploading proof for withdrawal request: {}", withdrawalRequestId);
		
		// 1. Validate withdrawal request exists
		WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(withdrawalRequestId)
			.orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_NOT_FOUND));
		
		// 2. Check withdrawal status is APPROVED or WAITING_PROOF
		if (withdrawalRequest.getStatus() != WithdrawalStatus.APPROVED 
			&& withdrawalRequest.getStatus() != WithdrawalStatus.WAITING_PROOF) {
			log.error("Invalid withdrawal status for proof upload: {}", withdrawalRequest.getStatus());
			throw new AppException(ErrorCode.INVALID_STATUS);
		}
		
		// 3. Create Proof document
		Proof proof = Proof.builder()
			.withdrawalRequestId(withdrawalRequestId)
			.imageUrl(imageUrl)
			.description(description)
			.aiStatus(AiStatus.PROCESSING)
			.build();
		
		Proof savedProof = proofRepository.save(proof);
		log.info("Proof created with ID: {}", savedProof.getId());
		
		// 4. Get campaign context for AI analysis
		Campaign campaign = campaignRepository.findById(withdrawalRequest.getCampaignId())
			.orElseThrow(() -> new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));
		
		// 5. Determine proof type based on withdrawal type
		String proofType = (withdrawalRequest.getType() == WithdrawalType.EMERGENCY) ? "SELFIE" : "INVOICE";
		
		// 6. Build context for AI Service
		Map<String, String> context = new HashMap<>();
		context.put("campaignContext", campaign.getTitle() + " - " + campaign.getDescription());
		context.put("withdrawalReason", withdrawalRequest.getReason());
		
		// For SELFIE type, we would need kycImageUrl (TODO: implement KYC storage)
		// context.put("kycImageUrl", "...");
		
		// 7. Publish Kafka event
		ProofVerificationRequestEvent event = new ProofVerificationRequestEvent(
			savedProof.getId(),
			imageUrl,
			proofType,
			context
		);
		
		proofKafkaProducer.sendProofVerificationRequest(event);
		log.info("Kafka event sent for proof: {}", savedProof.getId());
		
		return toProofResponse(savedProof);
	}
	
	@Override
	public ProofResponse getProofById(String id) {
		log.info("Getting proof by ID: {}", id);
		Proof proof = proofRepository.findById(id)
			.orElseThrow(() -> new AppException(ErrorCode.PROOF_NOT_FOUND));
		return toProofResponse(proof);
	}
	
	@Override
	public List<ProofResponse> getProofsByWithdrawalId(String withdrawalRequestId) {
		log.info("Getting proofs for withdrawal request: {}", withdrawalRequestId);
		List<Proof> proofs = proofRepository.findByWithdrawalRequestId(withdrawalRequestId);
		return proofs.stream()
			.map(this::toProofResponse)
			.toList();
	}
	
	@Override
	public void updateProofFromAiResult(ProofVerificationResultEvent event) {
		log.info("Updating proof from AI result: {}", event.proofId());
		
		Proof proof = proofRepository.findById(event.proofId())
			.orElseThrow(() -> new AppException(ErrorCode.PROOF_NOT_FOUND));
		
		// Update AI analysis fields
		proof.setAiStatus(event.isValid() ? AiStatus.VERIFIED : AiStatus.REJECTED);
		proof.setAiScore(event.score());
		
		// Build analysis string including forensics metadata (BUG-04 fix)
		StringBuilder analysis = new StringBuilder();
		analysis.append(event.analysisDetails() != null ? event.analysisDetails() : "");
		
		if (event.metadata() != null && !event.metadata().isEmpty()) {
			var meta = event.metadata();
			if (Boolean.TRUE.equals(meta.get("has_exif_warning"))) {
				analysis.append("\n⚠️ EXIF warning: ").append(meta.getOrDefault("details", "N/A"));
			}
			Object software = meta.get("software_detected");
			if (software != null && !software.toString().isEmpty()) {
				analysis.append("\n🔍 Software: ").append(software);
			}
			if (Boolean.TRUE.equals(meta.get("is_duplicate"))) {
				analysis.append("\n🚫 Ảnh trùng lặp!");
			}
		}
		proof.setAiAnalysis(analysis.toString());
		
		Proof updatedProof = proofRepository.save(proof);
		log.info("Proof updated - ID: {}, Status: {}, Score: {}", 
			updatedProof.getId(), updatedProof.getAiStatus(), updatedProof.getAiScore());
		
		// Push WebSocket notification
		try {
			webSocketService.sendProofVerificationUpdate(
				updatedProof.getWithdrawalRequestId(),
				toProofResponse(updatedProof)
			);
			log.info("WebSocket notification sent for proof: {}", updatedProof.getId());
		} catch (Exception e) {
			log.error("Failed to send WebSocket notification for proof: {}", updatedProof.getId(), e);
		}
		
		// Optional: Auto-process withdrawal if verified with high score
		if (event.isValid() && event.score() >= 80) {
			log.info("Proof verified with high score, consider auto-processing withdrawal");
			// TODO: Implement auto-processing logic
		}
	}
	
	@Override
	public void updateProofFromHybridResult(HybridReasoningCallbackRequest request) {
		log.info("Updating proof from hybrid reasoning result: {}", request.proofId());
		
		Proof proof = proofRepository.findById(request.proofId())
			.orElseThrow(() -> new AppException(ErrorCode.PROOF_NOT_FOUND));
		
		// Map trust score and validity
		proof.setAiStatus(request.isValid() ? AiStatus.VERIFIED : AiStatus.REJECTED);
		proof.setAiScore(request.trustScore());
		
		// Build comprehensive analysis from hybrid reasoning details
		StringBuilder analysis = new StringBuilder();
		analysis.append(request.analysisSummary() != null ? request.analysisSummary() : "");
		
		if (request.geminiTotalAmount() != null && request.geminiTotalAmount() > 0) {
			analysis.append(String.format("\n[Gemini] Tổng tiền: %.0f VND, Số mặt hàng: %d",
				request.geminiTotalAmount(),
				request.geminiItemsCount() != null ? request.geminiItemsCount() : 0));
		}
		
		if (request.clipSceneScore() != null) {
			analysis.append(String.format("\n[CLIP] Scene relevance: %.2f", request.clipSceneScore()));
		}
		
		if (Boolean.TRUE.equals(request.duplicateDetected())) {
			analysis.append("\n⚠️ Phát hiện ảnh trùng lặp!");
		}
		
		if (request.trustHash() != null) {
			analysis.append("\n[Hash] ").append(request.trustHash());
		}
		
		proof.setAiAnalysis(analysis.toString());
		
		Proof updatedProof = proofRepository.save(proof);
		log.info("Proof updated from hybrid reasoning - ID: {}, Status: {}, Score: {}",
			updatedProof.getId(), updatedProof.getAiStatus(), updatedProof.getAiScore());
		
		// Push WebSocket notification
		try {
			webSocketService.sendProofVerificationUpdate(
				updatedProof.getWithdrawalRequestId(),
				toProofResponse(updatedProof)
			);
			log.info("WebSocket notification sent for hybrid proof: {}", updatedProof.getId());
		} catch (Exception e) {
			log.error("Failed to send WebSocket notification for proof: {}", updatedProof.getId(), e);
		}
	}
	
	private ProofResponse toProofResponse(Proof proof) {
		return new ProofResponse(
			proof.getId(),
			proof.getWithdrawalRequestId(),
			proof.getImageUrl(),
			proof.getDescription(),
			proof.getAiStatus(),
			proof.getAiScore(),
			proof.getAiAnalysis(),
			proof.getCreatedAt()
		);
	}
}
