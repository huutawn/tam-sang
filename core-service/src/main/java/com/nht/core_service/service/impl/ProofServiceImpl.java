package com.nht.core_service.service.impl;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.nht.core_service.document.Campaign;
import com.nht.core_service.document.Proof;
import com.nht.core_service.document.WithdrawalRequest;
import com.nht.core_service.dto.request.HybridReasoningCallbackRequest;
import com.nht.core_service.dto.response.ProofResponse;
import com.nht.core_service.enums.AiStatus;
import com.nht.core_service.enums.WithdrawalStatus;
import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;
import com.nht.core_service.kafka.event.HybridReasoningRequestEvent;
import com.nht.core_service.kafka.event.ProofVerificationResultEvent;
import com.nht.core_service.kafka.producer.HybridReasoningProducer;
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
	private final HybridReasoningProducer hybridReasoningProducer;
	private final WebSocketService webSocketService;

	@Override
	public ProofResponse uploadProof(String withdrawalRequestId, List<String> billImageUrls,
			List<String> sceneImageUrls, String description) {
		log.info("Uploading proof for withdrawal request: {}, billImages: {}, sceneImages: {}",
				withdrawalRequestId, billImageUrls.size(), sceneImageUrls.size());

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
				.billImageUrls(billImageUrls)
				.sceneImageUrls(sceneImageUrls)
				.description(description)
				.aiStatus(AiStatus.PROCESSING)
				.build();

		Proof savedProof = proofRepository.save(proof);
		log.info("Proof created with ID: {}", savedProof.getId());

		// 4. Get campaign context for AI analysis
		Campaign campaign = campaignRepository.findById(withdrawalRequest.getCampaignId())
				.orElseThrow(() -> new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));

		// 5. Publish ONE unified hybrid reasoning event for proof AI
		HybridReasoningRequestEvent event = new HybridReasoningRequestEvent(
				savedProof.getId(),
				campaign.getId(),
				billImageUrls,
				sceneImageUrls,
				withdrawalRequest.getReason(),
				buildCampaignGoal(campaign));

		hybridReasoningProducer.sendHybridReasoningRequest(event);
		log.info("Hybrid reasoning event sent for proof: {}", savedProof.getId());

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
					toProofResponse(updatedProof));
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

		// Map rubric decision to current enum:
		// VERIFIED -> VERIFIED, NEEDS_REVIEW -> keep PROCESSING for manual follow-up,
		// SUSPICIOUS -> REJECTED
		proof.setAiStatus(mapHybridDecisionToStatus(request.decision(), request.isValid()));
		proof.setAiScore(request.trustScore());

		// Build comprehensive analysis from hybrid reasoning details
		StringBuilder analysis = new StringBuilder();
		analysis.append(request.analysisSummary() != null ? request.analysisSummary() : "");

		if (request.decision() != null) {
			analysis.append("\n[Decision] ").append(request.decision());
		}

		if (request.rubricVersion() != null) {
			analysis.append("\n[Rubric] ").append(request.rubricVersion());
		}

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
					toProofResponse(updatedProof));
			log.info("WebSocket notification sent for hybrid proof: {}", updatedProof.getId());
		} catch (Exception e) {
			log.error("Failed to send WebSocket notification for proof: {}", updatedProof.getId(), e);
		}
	}

	private ProofResponse toProofResponse(Proof proof) {
		return new ProofResponse(
				proof.getId(),
				proof.getWithdrawalRequestId(),
				proof.getBillImageUrls(),
				proof.getSceneImageUrls(),
				proof.getDescription(),
				proof.getAiStatus(),
				proof.getAiScore(),
				proof.getAiAnalysis(),
				proof.getUpvoteCount(),
				proof.getReportCount(),
				proof.getCreatedAt());
	}

	private String buildCampaignGoal(Campaign campaign) {
		String narrative = campaign.getContent();
		if (narrative == null || narrative.isBlank()) {
			narrative = campaign.getDescription();
		}
		if (narrative == null || narrative.isBlank()) {
			narrative = campaign.getTitle();
		}
		return campaign.getTitle() + " - " + narrative;
	}

	private AiStatus mapHybridDecisionToStatus(String decision, Boolean isValid) {
		if (Boolean.TRUE.equals(isValid)) {
			return AiStatus.VERIFIED;
		}
		if ("NEEDS_REVIEW".equalsIgnoreCase(decision)) {
			return AiStatus.PROCESSING;
		}
		return AiStatus.REJECTED;
	}

	@Override
	public Page<ProofResponse> getProofsForAdmin(AiStatus aiStatus, int page, int size) {
		log.info("Getting proofs for admin - aiStatus: {}, page: {}, size: {}", aiStatus, page, size);
		Pageable pageable = PageRequest.of(page, size,
				Sort.by(Sort.Direction.ASC, "aiStatus")
						.and(Sort.by(Sort.Direction.DESC, "createdAt")));
		if (aiStatus != null) {
			return proofRepository.findByAiStatus(aiStatus, pageable)
					.map(this::toProofResponse);
		}
		return proofRepository.findAll(pageable)
				.map(this::toProofResponse);
	}

	@Override
	public ProofResponse approveProof(String id) {
		log.info("Admin manually approving proof: {}", id);
		Proof proof = proofRepository.findById(id)
				.orElseThrow(() -> new AppException(ErrorCode.PROOF_NOT_FOUND));

		proof.setAiStatus(AiStatus.VERIFIED);
		Proof savedProof = proofRepository.save(proof);

		WithdrawalRequest withdrawalRequest = withdrawalRequestRepository.findById(proof.getWithdrawalRequestId())
				.orElse(null);
		if (withdrawalRequest != null && withdrawalRequest.getStatus() == WithdrawalStatus.WAITING_PROOF) {
			withdrawalRequest.setStatus(WithdrawalStatus.COMPLETED);
			withdrawalRequestRepository.save(withdrawalRequest);
			log.info("Withdrawal request {} marked as COMPLETED after proof approval.", withdrawalRequest.getId());
		}

		return toProofResponse(savedProof);
	}

	@Override
	public ProofResponse rejectProof(String id) {
		log.info("Admin manually rejecting proof: {}", id);
		Proof proof = proofRepository.findById(id)
				.orElseThrow(() -> new AppException(ErrorCode.PROOF_NOT_FOUND));

		proof.setAiStatus(AiStatus.REJECTED);
		Proof savedProof = proofRepository.save(proof);

		return toProofResponse(savedProof);
	}

	@Override
	public ProofResponse upvoteProof(String id, String userId) {
		log.info("User {} upvoting proof: {}", userId, id);
		Proof proof = proofRepository.findById(id)
				.orElseThrow(() -> new AppException(ErrorCode.PROOF_NOT_FOUND));

		if (proof.getUpvoterIds() == null) {
			proof.setUpvoterIds(new java.util.ArrayList<>());
		}

		if (!proof.getUpvoterIds().contains(userId)) {
			proof.getUpvoterIds().add(userId);
			proof.setUpvoteCount(proof.getUpvoterIds().size());
			proof = proofRepository.save(proof);
		}

		return toProofResponse(proof);
	}

	@Override
	public ProofResponse reportProof(String id, String userId) {
		log.info("User {} reporting proof: {}", userId, id);
		Proof proof = proofRepository.findById(id)
				.orElseThrow(() -> new AppException(ErrorCode.PROOF_NOT_FOUND));

		if (proof.getReporterIds() == null) {
			proof.setReporterIds(new java.util.ArrayList<>());
		}

		if (!proof.getReporterIds().contains(userId)) {
			proof.getReporterIds().add(userId);
			proof.setReportCount(proof.getReporterIds().size());

			// Custom logic: reject if more than 5 reports
			if (proof.getReportCount() > 5) {
				proof.setAiStatus(AiStatus.REJECTED);
				log.warn("Proof {} reaches > 5 reports, marked as REJECTED", id);
			}

			proof = proofRepository.save(proof);
		}

		return toProofResponse(proof);
	}
}
