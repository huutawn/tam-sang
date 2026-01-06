package com.nht.core_service.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateDonationRequest(
		@NotBlank String campaignId,
		@NotBlank String donorFullName,
		@Email String donorEmail,
		String donorPhone,
		@NotNull @Positive BigDecimal amount,
		String content,
		String bankName,
		String bankNumber) {}
