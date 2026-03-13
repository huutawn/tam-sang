package com.nht.core_service.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.nht.core_service.dto.request.HybridReasoningCallbackRequest;
import com.nht.core_service.dto.response.ApiResponse;
import com.nht.core_service.dto.response.ProofResponse;
import com.nht.core_service.enums.AiStatus;
import com.nht.core_service.service.ProofService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/proofs")
@RequiredArgsConstructor
@Slf4j
public class ProofController {

	private final ProofService proofService;

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<ApiResponse<ProofResponse>> uploadProof(
			@Valid @RequestBody com.nht.core_service.dto.request.ProofUploadRequest request) {
		log.info("Uploading proof for withdrawal: {}, billImages: {}, sceneImages: {}",
				request.getWithdrawalRequestId(),
				request.getBillImageUrls() != null ? request.getBillImageUrls().size() : 0,
				request.getSceneImageUrls() != null ? request.getSceneImageUrls().size() : 0);

		ProofResponse response = proofService.uploadProof(
				request.getWithdrawalRequestId(),
				request.getBillImageUrls(),
				request.getSceneImageUrls(),
				request.getDescription());

		return ResponseEntity.ok(new ApiResponse<>(1000, "Proof uploaded successfully", response));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<ProofResponse>> getProof(
			@PathVariable String id) {
		log.info("Getting proof: {}", id);
		ProofResponse response = proofService.getProofById(id);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Proof retrieved successfully", response));
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<ProofResponse>>> getProofsByWithdrawal(
			@RequestParam String withdrawalId) {
		log.info("Getting proofs for withdrawal: {}", withdrawalId);
		List<ProofResponse> proofs = proofService.getProofsByWithdrawalId(withdrawalId);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Proofs retrieved successfully", proofs));
	}

	/**
	 * Admin endpoint: Get all proofs with optional aiStatus filter.
	 * Sorted by aiStatus (PROCESSING first) then by createdAt DESC.
	 */
	@GetMapping("/admin")
	public ResponseEntity<ApiResponse<Page<ProofResponse>>> getProofsForAdmin(
			@RequestParam(required = false) AiStatus aiStatus,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size) {
		log.info("Admin getting proofs - aiStatus: {}, page: {}, size: {}", aiStatus, page, size);
		Page<ProofResponse> proofs = proofService.getProofsForAdmin(aiStatus, page, size);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Admin proofs retrieved successfully", proofs));
	}

	// ------------------------------------------------------------------
	// Internal callback endpoint (service-to-service, called by AI-service)
	// ------------------------------------------------------------------

	/**
	 * Receive hybrid reasoning result from AI-service via HTTP callback.
	 * <p>
	 * This endpoint is called by the AI-service after it completes
	 * CLIP + Gemini analysis on proof images. The path uses {@code /internal/}
	 * prefix to indicate it is not user-facing.
	 */
	@PostMapping("/internal/hybrid-callback")
	public ResponseEntity<ApiResponse<Void>> handleHybridReasoningCallback(
			@Valid @RequestBody HybridReasoningCallbackRequest request) {
		log.info("Received hybrid reasoning callback for proofId: {}, trustScore: {}, isValid: {}",
				request.proofId(), request.trustScore(), request.isValid());

		try {
			proofService.updateProofFromHybridResult(request);
			return ResponseEntity.ok(new ApiResponse<>(1000, "Hybrid reasoning result processed", null));
		} catch (Exception e) {
			log.error("Failed to process hybrid reasoning callback for proofId: {}", request.proofId(), e);
			return ResponseEntity.internalServerError()
					.body(new ApiResponse<>(5000, "Failed to process callback: " + e.getMessage(), null));
		}
	}

	@PutMapping("/admin/{id}/approve")
	public ResponseEntity<ApiResponse<ProofResponse>> approveProof(@PathVariable String id) {
		log.info("Admin approving proof: {}", id);
		ProofResponse response = proofService.approveProof(id);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Proof approved successfully", response));
	}

	@PutMapping("/admin/{id}/reject")
	public ResponseEntity<ApiResponse<ProofResponse>> rejectProof(@PathVariable String id) {
		log.info("Admin rejecting proof: {}", id);
		ProofResponse response = proofService.rejectProof(id);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Proof rejected successfully", response));
	}

	@PutMapping("/{id}/upvote")
	public ResponseEntity<ApiResponse<ProofResponse>> upvoteProof(
			@PathVariable String id,
			org.springframework.security.core.Authentication authentication) {
		String userId = authentication.getName();
		log.info("User {} upvoting proof {}", userId, id);
		ProofResponse response = proofService.upvoteProof(id, userId);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Proof upvoted successfully", response));
	}

	@PutMapping("/{id}/report")
	public ResponseEntity<ApiResponse<ProofResponse>> reportProof(
			@PathVariable String id,
			org.springframework.security.core.Authentication authentication) {
		String userId = authentication.getName();
		log.info("User {} reporting proof {}", userId, id);
		ProofResponse response = proofService.reportProof(id, userId);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Proof reported successfully", response));
	}
}
