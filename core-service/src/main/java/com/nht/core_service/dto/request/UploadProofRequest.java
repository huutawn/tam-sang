package com.nht.core_service.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UploadProofRequest(
	@NotBlank(message = "Withdrawal request ID is required")
	String withdrawalRequestId,
	
	String description
) {
}
