package com.nht.core_service.controller;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.nht.core_service.dto.request.PaymentWebhookRequest;
import com.nht.core_service.dto.response.ApiResponse;
import com.nht.core_service.service.DonationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/webhook")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

	private final DonationService donationService;

	@PostMapping("/payment")
	public ResponseEntity<ApiResponse<Void>> handlePaymentWebhook(@Valid @RequestBody PaymentWebhookRequest request) {
		log.info("Received payment webhook: paymentCode={}, amount={}", request.paymentCode(), request.amount());

		donationService.processPaymentWebhook(request);

		return ResponseEntity.ok(new ApiResponse<>("Payment processed successfully", null));
	}
}
