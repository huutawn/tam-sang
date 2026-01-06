package com.nht.core_service.dto.event;

import java.math.BigDecimal;

public record DonationEvent(String campaignId, BigDecimal amount, String donorName, String message) {}
