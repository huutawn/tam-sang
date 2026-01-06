package com.nht.core_service.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.nht.core_service.dto.response.ApiResponse;
import com.nht.core_service.dto.response.ProofResponse;
import com.nht.core_service.service.ProofService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/proofs")
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
		
		return ResponseEntity.ok(ApiResponse.<ProofResponse>builder()
			.result(response)
			.build());
	}
	
	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<ProofResponse>> getProof(
		@PathVariable String id
	) {
		log.info("Getting proof: {}", id);
		ProofResponse response = proofService.getProofById(id);
		return ResponseEntity.ok(ApiResponse.<ProofResponse>builder()
			.result(response)
			.build());
	}
	
	@GetMapping
	public ResponseEntity<ApiResponse<List<ProofResponse>>> getProofsByWithdrawal(
		@RequestParam String withdrawalId
	) {
		log.info("Getting proofs for withdrawal: {}", withdrawalId);
		List<ProofResponse> proofs = proofService.getProofsByWithdrawalId(withdrawalId);
		return ResponseEntity.ok(ApiResponse.<List<ProofResponse>>builder()
			.result(proofs)
			.build());
	}
}
