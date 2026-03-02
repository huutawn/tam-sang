package com.nht.core_service.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record FaceVerificationCallbackRequest(
	@NotBlank @JsonProperty("withdrawal_id") String withdrawalId,
	@NotNull @JsonProperty("verified") Boolean verified,
	@JsonProperty("score") Integer score,
	@NotBlank @JsonProperty("status") String status,  // VERIFIED, WARNING, FAILED
	@JsonProperty("analysis_log") String analysisLog
) {}
