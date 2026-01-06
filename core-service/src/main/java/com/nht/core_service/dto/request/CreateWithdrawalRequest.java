package com.nht.core_service.dto.request;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import com.nht.core_service.enums.WithdrawalType;

public record CreateWithdrawalRequest(
		@NotBlank String campaignId,
		@NotNull @Positive BigDecimal amount,
		@NotBlank String reason,
		WithdrawalType type,
		Boolean quick
		) {}
