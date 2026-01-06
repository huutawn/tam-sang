package com.nht.core_service.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record InitDonationRequest(
		@NotBlank(message = "Campaign ID is required") String campaignId,
		@NotNull @Positive(message = "Amount must be greater than 0") BigDecimal amount,
		@NotBlank(message = "Donor name is required") String donorName,
		String message) {}
