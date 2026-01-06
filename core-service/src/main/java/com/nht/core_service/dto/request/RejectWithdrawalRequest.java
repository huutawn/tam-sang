package com.nht.core_service.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RejectWithdrawalRequest(
	@NotBlank(message = "Rejection reason is required")
	String reason
) {
}
