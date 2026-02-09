package com.nht.core_service.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateCampaignRequest(
		@NotBlank(message = "Title is required") String title,
		String content,
		@NotNull @Positive BigDecimal targetAmount,
		List<String> images,
		LocalDateTime startDate,
		LocalDateTime endDate) {}
