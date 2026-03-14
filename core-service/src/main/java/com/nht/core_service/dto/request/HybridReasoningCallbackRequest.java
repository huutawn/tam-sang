package com.nht.core_service.dto.request;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * DTO for the HTTP callback from AI-service after hybrid reasoning completes.
 * <p>
 * Maps to the Python {@code CallbackPayload} model in
 * {@code ai-service/app/models/hybrid_events.py}.
 */
public record HybridReasoningCallbackRequest(

	@NotBlank(message = "proof_id is required")
	@JsonProperty("proof_id")
	String proofId,

	@NotNull(message = "trust_score is required")
	@Min(0) @Max(100)
	@JsonProperty("trust_score")
	Integer trustScore,

	@NotNull(message = "is_valid is required")
	@JsonProperty("is_valid")
	Boolean isValid,

	@JsonProperty("analysis_summary")
	String analysisSummary,

	@JsonProperty("decision")
	String decision,

	@JsonProperty("rubric_version")
	String rubricVersion,

	@JsonProperty("trust_hash")
	String trustHash,

	@JsonProperty("gemini_total_amount")
	Double geminiTotalAmount,

	@JsonProperty("gemini_items_count")
	Integer geminiItemsCount,

	@JsonProperty("gemini_price_warnings")
	List<String> geminiPriceWarnings,

	@JsonProperty("gemini_validation_warnings")
	List<String> geminiValidationWarnings,

	@JsonProperty("clip_scene_score")
	Double clipSceneScore,

	@JsonProperty("clip_scene_support_score")
	Double clipSceneSupportScore,

	@JsonProperty("clip_forensic_score")
	Integer clipForensicScore,

	@JsonProperty("clip_forensic_warnings")
	List<String> clipForensicWarnings,

	@JsonProperty("duplicate_detected")
	Boolean duplicateDetected,

	@JsonProperty("timestamp")
	Instant timestamp
) {
}
