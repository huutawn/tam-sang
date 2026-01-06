package com.nht.core_service.controller;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.nht.core_service.dto.request.InitDonationRequest;
import com.nht.core_service.dto.response.ApiResponse;
import com.nht.core_service.dto.response.InitDonationResponse;
import com.nht.core_service.service.DonationService;

import lombok.RequiredArgsConstructor;
import vn.payos.type.CheckoutResponseData;

@RestController
@RequestMapping("/api/v1/donations")
@RequiredArgsConstructor
public class DonationController {

	private final DonationService donationService;

	@PostMapping("/init")
	public ResponseEntity<ApiResponse<CheckoutResponseData>> initializeDonation(
			@Valid @RequestBody InitDonationRequest request) {
		CheckoutResponseData response = donationService.initializeDonation(request);
		return ResponseEntity.ok(new ApiResponse<>("Donation initialized successfully", response));
	}
}
