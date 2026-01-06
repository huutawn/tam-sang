package com.nht.core_service.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PaymentWebhookRequest(
		@NotBlank(message = "Payment code is required") String paymentCode,
		@NotNull @Positive(message = "Amount must be greater than 0") BigDecimal amount) {}
