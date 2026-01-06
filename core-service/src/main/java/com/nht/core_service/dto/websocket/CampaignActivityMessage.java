package com.nht.core_service.dto.websocket;

public record CampaignActivityMessage(
		String campaignId, String activityType, String description, String timestamp) {}
