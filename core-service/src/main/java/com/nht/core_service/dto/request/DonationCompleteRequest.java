package com.nht.core_service.dto.request;

import java.math.BigDecimal;

public record DonationCompleteRequest(
        String donationId,
        String campaignId,
        BigDecimal amount,
        String donorName,
        String message,
        String transactionHash,
        Long blockIndex
) {}
