package com.nht.core_service.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.nht.core_service.dto.request.DonationCompleteRequest;
import com.nht.core_service.dto.request.InitDonationRequest;
import com.nht.core_service.dto.response.ApiResponse;
import com.nht.core_service.dto.response.LiveDonationResponse;
import com.nht.core_service.service.DonationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/donations")
@RequiredArgsConstructor
public class DonationController {

	private final DonationService donationService;

	@PostMapping("/init")
	public ResponseEntity<ApiResponse<String>> initializeDonation(
			@Valid @RequestBody InitDonationRequest request) {
		String response = donationService.initializeDonation(request);
		return ResponseEntity.ok(new ApiResponse<>("Donation initialized successfully", response));
	}

	@PostMapping("/complete")
	public ResponseEntity<ApiResponse<Void>> completeDonation(
			@Valid @RequestBody DonationCompleteRequest request) {
		donationService.completeDonation(request);
		return ResponseEntity.ok(new ApiResponse<>("Donation completed successfully", null));
	}

	@GetMapping("/recent")
	public ResponseEntity<ApiResponse<List<LiveDonationResponse>>> getRecentDonations() {
		List<LiveDonationResponse> donations = donationService.getRecentCompletedDonations();
		return ResponseEntity.ok(new ApiResponse<>("Success", donations));
	}
}
