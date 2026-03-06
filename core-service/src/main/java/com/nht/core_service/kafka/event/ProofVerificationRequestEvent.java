package com.nht.core_service.kafka.event;

import java.util.List;
import java.util.Map;

public record ProofVerificationRequestEvent(
		String proofId,
		List<String> billImageUrls,
		List<String> sceneImageUrls,
		Map<String, String> context) {
}
