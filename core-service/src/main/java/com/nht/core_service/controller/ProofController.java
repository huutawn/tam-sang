package com.nht.core_service.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.nht.core_service.dto.request.HybridReasoningCallbackRequest;
import com.nht.core_service.dto.response.ApiResponse;
import com.nht.core_service.dto.response.ProofResponse;
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
		@RequestParam MultipartFile file,
		@RequestParam(required = false) String description
	) {
		log.info("Uploading proof for withdrawal: {}, file: {}", withdrawalRequestId, file.getOriginalFilename());
		
		// TODO: Upload file to File Service and get imageUrl
		// For now, simulate with a placeholder URL
		String imageUrl = "https://file-service/uploads/" + file.getOriginalFilename();
		
		ProofResponse response = proofService.uploadProof(withdrawalRequestId, imageUrl, description);
		
		return ResponseEntity.ok(new ApiResponse<>(1000, "Proof uploaded successfully", response));
	}
	
	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<ProofResponse>> getProof(
		@PathVariable String id
	) {
		log.info("Getting proof: {}", id);
		ProofResponse response = proofService.getProofById(id);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Proof retrieved successfully", response));
	}
	
	@GetMapping
	public ResponseEntity<ApiResponse<List<ProofResponse>>> getProofsByWithdrawal(
		@RequestParam String withdrawalId
	) {
		log.info("Getting proofs for withdrawal: {}", withdrawalId);
		List<ProofResponse> proofs = proofService.getProofsByWithdrawalId(withdrawalId);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Proofs retrieved successfully", proofs));
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
		@Valid @RequestBody HybridReasoningCallbackRequest request
	) {
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
