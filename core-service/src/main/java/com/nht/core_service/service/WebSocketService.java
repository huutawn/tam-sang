package com.nht.core_service.service;

import com.nht.core_service.dto.response.CampaignResponse;
import com.nht.core_service.dto.response.DonationResponse;
import com.nht.core_service.dto.response.ProofResponse;
import com.nht.core_service.dto.websocket.CampaignActivityMessage;
import com.nht.core_service.dto.websocket.CampaignStatsMessage;

public interface WebSocketService {
    void sendCampaignUpdate(String campaignId, CampaignResponse campaign);
    void sendDonationNotification(String campaignId, DonationResponse donation);
    void sendProofVerificationUpdate(String withdrawalRequestId, ProofResponse proof);

    void sendCampaignActivity(CampaignActivityMessage activityMessage);

    void sendCampaignStats(CampaignStatsMessage statsMessage);
}
