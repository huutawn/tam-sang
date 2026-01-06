package com.nht.core_service.dto.response;

import java.math.BigDecimal;

public record InitDonationResponse(
		String donationId, String campaignId, BigDecimal amount, String paymentCode, String qrCodeUrl, String status) {}
