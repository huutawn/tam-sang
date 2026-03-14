package com.nht.core_service.kafka.event;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Kafka event sent to AI-service for hybrid verification.
 * <p>
 * The AI-service combines CLIP (local scene-image analysis) with Gemini
 * (remote bill analysis) to compute a trust score. Results are returned
 * via HTTP callback to {@code /internal/proofs/hybrid-callback}.
 */
public record HybridReasoningRequestEvent(
	@JsonProperty("proof_id") String proofId,
	@JsonProperty("campaign_id") String campaignId,
	@JsonProperty("list_bill_image_url") List<String> listBillImageUrl,
	@JsonProperty("list_image_url") List<String> listImageUrl,
	@JsonProperty("withdrawal_reason") String withdrawalReason,
	@JsonProperty("campaign_goal") String campaignGoal
) {
}
