package com.nht.core_service.service;

import com.nht.core_service.dto.request.DonationCompleteRequest;
import com.nht.core_service.dto.request.InitDonationRequest;
import com.nht.core_service.dto.request.PaymentWebhookRequest;
import com.nht.core_service.dto.response.InitDonationResponse;
import vn.payos.type.CheckoutResponseData;

public interface DonationService {

	String initializeDonation(InitDonationRequest request);

	void processPaymentWebhook(PaymentWebhookRequest request);

	void completeDonation(DonationCompleteRequest request);
}

