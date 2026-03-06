package com.nht.core_service.dto.response;

import java.time.Instant;
import java.util.List;

import com.nht.core_service.enums.AiStatus;

public record ProofResponse(
		String id,
		String withdrawalRequestId,
		List<String> billImageUrls,
		List<String> sceneImageUrls,
		String description,
		AiStatus aiStatus,
		Integer aiScore,
		String aiAnalysis,
		Instant createdAt) {
}
