package com.nht.core_service.dto.event;

import java.math.BigDecimal;
import java.util.UUID;

public record DonationEvent(UUID donationId, String campaignId, BigDecimal amount, String donorName, String message) {}
