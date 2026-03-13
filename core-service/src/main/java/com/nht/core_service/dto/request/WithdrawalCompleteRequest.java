package com.nht.core_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record WithdrawalCompleteRequest(
        @NotBlank(message = "WithdrawalID is required") String withdrawalId,
        @NotBlank(message = "CampaignID is required") String campaignId,
        @NotNull(message = "Amount is required") @Positive(message = "Amount must be positive") BigDecimal amount,
        @NotBlank(message = "Transaction hash is required") String transactionHash,
        Long blockIndex) {
}
