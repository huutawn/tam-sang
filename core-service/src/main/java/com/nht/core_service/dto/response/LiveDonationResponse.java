package com.nht.core_service.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LiveDonationResponse(
		String id,
		String donorFullName,
		String campaignTitle,
		BigDecimal amount,
		LocalDateTime createdAt) {}
