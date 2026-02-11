package com.nht.core_service.kafka.event;

import java.util.List;

/**
 * Kafka event sent to AI-service for hybrid verification.
 * <p>
 * The AI-service combines CLIP (local scene-image analysis) with Gemini
 * (remote bill analysis) to compute a trust score. Results are returned
 * via HTTP callback to {@code /internal/proofs/hybrid-callback}.
 */
public record HybridReasoningRequestEvent(
	String proofId,
	String campaignId,
	List<String> listBillImageUrl,
	List<String> listImageUrl,
	String withdrawalReason,
	String campaignGoal
) {
}
