package com.nht.core_service.service;

import com.nht.core_service.dto.response.CampaignResponse;
import com.nht.core_service.dto.response.DonationResponse;
import com.nht.core_service.dto.response.ProofResponse;

public interface WebSocketService {
    void sendCampaignUpdate(String campaignId, CampaignResponse campaign);
    void sendDonationNotification(String campaignId, DonationResponse donation);
    void sendProofVerificationUpdate(String withdrawalRequestId, ProofResponse proof);
}
