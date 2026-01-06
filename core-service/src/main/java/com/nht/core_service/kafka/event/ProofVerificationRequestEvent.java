package com.nht.core_service.kafka.event;

import java.util.Map;

public record ProofVerificationRequestEvent(
	String proofId,
	String imageUrl,
	String type,  // INVOICE or SELFIE
	Map<String, String> context
) {
}
