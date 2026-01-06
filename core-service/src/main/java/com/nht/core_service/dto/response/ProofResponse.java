package com.nht.core_service.dto.response;

import java.time.Instant;

import com.nht.core_service.enums.AiStatus;

public record ProofResponse(
	String id,
	String withdrawalRequestId,
	String imageUrl,
	String description,
	AiStatus aiStatus,
	Integer aiScore,
	String aiAnalysis,
	Instant createdAt
) {
}
