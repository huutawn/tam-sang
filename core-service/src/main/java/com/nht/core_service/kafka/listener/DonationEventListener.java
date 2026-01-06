package com.nht.core_service.kafka.listener;

import java.time.Instant;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.nht.core_service.config.KafkaTopicConfig;
import com.nht.core_service.document.Campaign;
import com.nht.core_service.dto.event.DonationEvent;
import com.nht.core_service.dto.websocket.CampaignActivityMessage;
import com.nht.core_service.dto.websocket.CampaignStatsMessage;
import com.nht.core_service.repository.jpa.DonationRepository;
import com.nht.core_service.repository.mongodb.CampaignRepository;
import com.nht.core_service.service.WebSocketService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class DonationEventListener {

	private final MongoTemplate mongoTemplate;
	private final RedisTemplate<String, Long> redisTemplate;
	private final CampaignRepository campaignRepository;
	private final DonationRepository donationRepository;
	private final WebSocketService webSocketService;

	@KafkaListener(topics = KafkaTopicConfig.DONATION_EVENTS_TOPIC, groupId = "core-service-group")
	public void handleDonationEvent(DonationEvent event) {
		log.info("Received donation event: campaignId={}, amount={}", event.campaignId(), event.amount());

		try {
			// Task 1: Update MongoDB Campaign.currentAmount atomically
			updateMongoCampaignAmount(event);

			// Task 2: Update Redis cache
			updateRedisCache(event);

			// Task 3: Send WebSocket notifications
			sendWebSocketNotifications(event);

		} catch (Exception e) {
			log.error("Error processing donation event: {}", event, e);
		}
	}

	private void updateMongoCampaignAmount(DonationEvent event) {
		Query query = new Query(Criteria.where("id").is(event.campaignId()));
		Update update = new Update().inc("currentAmount", event.amount().doubleValue());

		mongoTemplate.updateFirst(query, update, Campaign.class);
		log.info("Updated MongoDB campaign currentAmount: campaignId={}", event.campaignId());
	}

	private void updateRedisCache(DonationEvent event) {
		String cacheKey = "campaign:" + event.campaignId() + ":amount";

		// Update if exists in cache
		if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
			redisTemplate.opsForValue().increment(cacheKey, event.amount().longValue());
			log.info("Updated Redis cache: key={}", cacheKey);
		}
	}

	private void sendWebSocketNotifications(DonationEvent event) {
		// Get updated campaign data
		Campaign campaign = campaignRepository.findById(event.campaignId()).orElse(null);

		if (campaign != null) {
			// Get donation count
			Long donationCount = donationRepository.countByCampaignId(event.campaignId());

			// Send campaign stats update
			CampaignStatsMessage statsMessage = new CampaignStatsMessage(
					event.campaignId(), campaign.getCurrentAmount(), donationCount, event.donorName());

			webSocketService.sendCampaignStats(statsMessage);

			// Send activity notification
			String description = String.format(
					"%s đã ủng hộ %s VND", event.donorName(), event.amount().longValue());

			CampaignActivityMessage activityMessage = new CampaignActivityMessage(
					event.campaignId(), "DONATION", description, Instant.now().toString());

			webSocketService.sendCampaignActivity(activityMessage);

			log.info("Sent WebSocket notifications for campaign: {}", event.campaignId());
		}
	}
}
