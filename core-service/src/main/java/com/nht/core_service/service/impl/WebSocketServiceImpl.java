package com.nht.core_service.service.impl;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.nht.core_service.dto.response.CampaignResponse;
import com.nht.core_service.dto.response.DonationResponse;
import com.nht.core_service.dto.response.ProofResponse;
import com.nht.core_service.dto.websocket.CampaignActivityMessage;
import com.nht.core_service.dto.websocket.CampaignStatsMessage;
import com.nht.core_service.service.WebSocketService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketServiceImpl implements WebSocketService {

	private final SimpMessagingTemplate messagingTemplate;
	
	@Override
	public void sendCampaignUpdate(String campaignId, CampaignResponse campaign) {
		String destination = "/topic/campaign/" + campaignId + "/update";
		messagingTemplate.convertAndSend(destination, campaign);
		log.info("Sent campaign update to {}", destination);
	}
	
	@Override
	public void sendDonationNotification(String campaignId, DonationResponse donation) {
		String destination = "/topic/campaign/" + campaignId + "/donation";
		messagingTemplate.convertAndSend(destination, donation);
		log.info("Sent donation notification to {}", destination);
	}
	
	@Override
	public void sendProofVerificationUpdate(String withdrawalRequestId, ProofResponse proof) {
		String destination = "/topic/withdrawal/" + withdrawalRequestId + "/proof";
		messagingTemplate.convertAndSend(destination, proof);
		log.info("Sent proof verification update to {}: status={}, score={}", 
			destination, proof.aiStatus(), proof.aiScore());
	}

	// Keep old methods for backward compatibility
	public void sendCampaignStats(CampaignStatsMessage message) {
		String destination = "/topic/campaign/" + message.campaignId() + "/stats";
		messagingTemplate.convertAndSend(destination, message);
		log.info("Sent campaign stats to {}: amount={}", destination, message.currentAmount());
	}

	public void sendCampaignActivity(CampaignActivityMessage message) {
		String destination = "/topic/campaign/" + message.campaignId() + "/activities";
		messagingTemplate.convertAndSend(destination, message);
		log.info("Sent campaign activity to {}: type={}", destination, message.activityType());
	}
}
