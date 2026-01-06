package com.nht.core_service.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.nht.core_service.enums.PaymentStatus;

public record DonationResponse(
		String id,
		String campaignId,
		String donorFullName,
		BigDecimal amount,
		String content,
		String paymentMethod,
		PaymentStatus paymentStatus,
		LocalDateTime createdAt) {}
