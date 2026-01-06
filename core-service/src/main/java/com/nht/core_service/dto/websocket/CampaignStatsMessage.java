package com.nht.core_service.dto.websocket;

import java.math.BigDecimal;

public record CampaignStatsMessage(String campaignId, BigDecimal currentAmount, Long donationCount, String lastDonor) {}
