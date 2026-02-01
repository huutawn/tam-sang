package com.nht.core_service.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.nht.core_service.dto.request.CreateWithdrawalRequest;
import com.nht.core_service.dto.request.RejectWithdrawalRequest;
import com.nht.core_service.dto.response.ApiResponse;
import com.nht.core_service.dto.response.WithdrawalRequestResponse;
import com.nht.core_service.enums.WithdrawalStatus;
import com.nht.core_service.service.WithdrawalRequestService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/withdrawals")
@RequiredArgsConstructor
@Slf4j
public class WithdrawalController {
	
	private final WithdrawalRequestService withdrawalRequestService;
	
	@PostMapping
	public ResponseEntity<ApiResponse<WithdrawalRequestResponse>> createWithdrawal(
		@Valid @RequestBody CreateWithdrawalRequest request
	) {
		log.info("Creating withdrawal request for campaign: {}", request.campaignId());
		WithdrawalRequestResponse response = withdrawalRequestService.createWithdrawalRequest(request);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Withdrawal request created successfully", response));
	}
	
	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<WithdrawalRequestResponse>> getWithdrawal(
		@PathVariable String id
	) {
		log.info("Getting withdrawal request: {}", id);
		WithdrawalRequestResponse response = withdrawalRequestService.getWithdrawalRequestById(id);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Withdrawal request retrieved successfully", response));
	}
	
	@GetMapping
	public ResponseEntity<ApiResponse<Page<WithdrawalRequestResponse>>> getWithdrawals(
		@RequestParam(required = false) WithdrawalStatus status,
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "10") int size
	) {
		log.info("Getting withdrawals - status: {}, page: {}, size: {}", status, page, size);
		
		Page<WithdrawalRequestResponse> withdrawals;
		if (status != null) {
			withdrawals = withdrawalRequestService.getWithdrawalsByStatus(status, page, size);
		} else {
			withdrawals = withdrawalRequestService.getAllWithdrawals(page, size);
		}
		
		return ResponseEntity.ok(new ApiResponse<>(1000, "Withdrawals retrieved successfully", withdrawals));
	}
	
	@PutMapping("/{id}/approve")
	public ResponseEntity<ApiResponse<WithdrawalRequestResponse>> approveWithdrawal(
		@PathVariable String id
	) {
		log.info("Approving withdrawal request: {}", id);
		WithdrawalRequestResponse response = withdrawalRequestService.approveWithdrawal(id);
		return ResponseEntity.ok(new ApiResponse<>(1000, "Withdrawal request approved successfully", response));
	}
	
	@PutMapping("/{id}/reject")
	public ResponseEntity<ApiResponse<WithdrawalRequestResponse>> rejectWithdrawal(
		@PathVariable String id,
		@Valid @RequestBody RejectWithdrawalRequest request
	) {
		log.info("Rejecting withdrawal request: {} with reason: {}", id, request.reason());
		WithdrawalRequestResponse response = withdrawalRequestService.rejectWithdrawal(id, request.reason());
		return ResponseEntity.ok(new ApiResponse<>(1000, "Withdrawal request rejected successfully", response));
	}
}
