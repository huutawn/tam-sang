package com.nht.core_service.kafka.event;

import java.util.Map;

public record ProofVerificationResultEvent(
	String proofId,
	Integer score,
	Boolean isValid,
	String analysisDetails,
	Map<String, Object> metadata
) {
}
