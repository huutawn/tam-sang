package com.nht.core_service.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.nht.core_service.enums.CampaignStatus;

public record CampaignResponse(
		String id,
		String title,
		String content,
		BigDecimal targetAmount,
		BigDecimal currentAmount,
		BigDecimal walletBalance,
		List<String> images,
		CampaignStatus status,
		LocalDateTime startDate,
		LocalDateTime endDate,
		String ownerId,
		Boolean hasUsedQuickWithdrawal,
		Long likeCount,
		Long viewCount,
		Long commentCount) {}
