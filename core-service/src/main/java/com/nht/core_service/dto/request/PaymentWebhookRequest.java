package com.nht.core_service.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PaymentWebhookRequest(
		@NotNull String id,
		String gateway,
		String transactionDate,
		String accountNumber,
		String code,
		String content,
		String transferType,
		BigDecimal transferAmount,
		String accumulated,
		String subAccount,
		String referenceCode,
		String description) {}
