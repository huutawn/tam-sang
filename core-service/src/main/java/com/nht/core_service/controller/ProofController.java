package com.nht.core_service.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<ProofResponse>> uploadProof(
			@RequestParam String withdrawalRequestId,
			@RequestParam(required = false) List<MultipartFile> billImages,
			@RequestParam(required = false) List<MultipartFile> sceneImages,
			@RequestParam(required = false) String description) {
		log.info("Uploading proof for withdrawal: {}, billImages: {}, sceneImages: {}",
				withdrawalRequestId,
				billImages != null ? billImages.size() : 0,
				sceneImages != null ? sceneImages.size() : 0);

		// TODO: Upload files to File Service and get URLs
		// For now, simulate with placeholder URLs
		List<String> billImageUrls = new ArrayList<>();
		if (billImages != null) {
			for (MultipartFile file : billImages) {
				billImageUrls.add("https://file-service/uploads/bills/" + file.getOriginalFilename());
			}
		}

		List<String> sceneImageUrls = new ArrayList<>();
		if (sceneImages != null) {
			for (MultipartFile file : sceneImages) {
				sceneImageUrls.add("https://file-service/uploads/scenes/" + file.getOriginalFilename());
			}
		}

		ProofResponse response = proofService.uploadProof(withdrawalRequestId, billImageUrls, sceneImageUrls,
				description);

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
}
