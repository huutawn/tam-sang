package com.nht.core_service.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import lombok.experimental.NonFinal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nht.core_service.config.KafkaTopicConfig;
import com.nht.core_service.document.Campaign;
import com.nht.core_service.document.ProcessEvent;
import com.nht.core_service.dto.event.DonationEvent;
import com.nht.core_service.dto.request.DonationCompleteRequest;
import com.nht.core_service.dto.request.InitDonationRequest;
import com.nht.core_service.dto.request.PaymentWebhookRequest;
import com.nht.core_service.dto.websocket.CampaignActivityMessage;
import com.nht.core_service.dto.websocket.CampaignStatsMessage;
import com.nht.core_service.entity.Donation;
import com.nht.core_service.enums.PaymentStatus;
import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;
import com.nht.core_service.repository.jpa.DonationRepository;
import com.nht.core_service.repository.mongodb.CampaignRepository;
import com.nht.core_service.repository.mongodb.ProcessEventRepository;
import com.nht.core_service.service.DonationService;
import com.nht.core_service.service.WebSocketService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.payos.type.CheckoutResponseData;

@Service
@RequiredArgsConstructor
@Slf4j
public class DonationServiceImpl implements DonationService {

	private final DonationRepository donationRepository;
	private final CampaignRepository campaignRepository;
	private final KafkaTemplate<String, Object> kafkaTemplate;
	private final MongoTemplate mongoTemplate;
	private final RedisTemplate<String, Long> redisTemplate;
	private final WebSocketService webSocketService;
	private final ProcessEventRepository processEventRepository;

	@Value("${secret-key}")
	@NonFinal
	private String secretKey;
	private static final String BANK_ID = "970422"; // VietQR MB Bank
	private static final String ACCOUNT_NO = "0962974546"; // Example account

	@Override
	@Transactional
	public String initializeDonation(InitDonationRequest request) {
		// Verify campaign exists
		Campaign campaign = campaignRepository
				.findById(request.campaignId())
				.orElseThrow(() -> new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));
		BigDecimal remaining = campaign.getTargetAmount().subtract(campaign.getCurrentAmount());
		BigDecimal amount = request.amount();
		if (request.amount().compareTo(remaining) > 0) {
			amount=remaining;
		}
		String paymentCode = generatePaymentCode();

		// Create donation with PENDING status
		Donation donation = Donation.builder()
				.campaignId(request.campaignId())
				.donorFullName(request.donorName())
				.amount(amount)
				.content(request.message())
				.paymentCode(paymentCode)
				.paymentMethod("BANK_TRANSFER")
				.paymentStatus(PaymentStatus.PENDING)
				.build();

		Donation savedDonation = donationRepository.save(donation);
		log.info("Donation initialized: id={}, paymentCode={}", savedDonation.getId(), paymentCode);

		// Generate VietQR URL
		String url=generateQRCodeUrl(amount,paymentCode,campaign.getTitle());
		return url;
	}



	@Override
	@Transactional
	public void processPaymentWebhook(PaymentWebhookRequest request) {
		String content =request.content();
		Pattern pattern = Pattern.compile("\\. (TS\\d{13}[A-Z0-9]{6}) \\.");
		Matcher matcher = pattern.matcher(content);
		if(matcher.find()){
			content=matcher.group(1);
		}
		else{
			throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
		}
		// Find donation by payment code
		Donation donation = donationRepository
				.findByPaymentCode(content)
				.orElseThrow(() -> new AppException(ErrorCode.DONATION_NOT_FOUND));

		// Validate amount
		if (donation.getAmount().compareTo(request.transferAmount()) != 0) {
			log.error(
					"Payment amount mismatch: expected={}, received={}",
					donation.getAmount(),
					request.transferAmount());
			throw new AppException(ErrorCode.INVALID_DONATION_AMOUNT);
		}

		// Check if already processed
		if (donation.getPaymentStatus() == PaymentStatus.COMPLETED) {
			log.warn("Donation already processed: {}", donation.getId());
			return;
		}


		// Publish event to Kafka (with donationId as key for tracing)
		DonationEvent event = new DonationEvent(donation.getId(),
				donation.getCampaignId(), donation.getAmount(), donation.getDonorFullName(), donation.getContent());

		kafkaTemplate.send(KafkaTopicConfig.DONATION_EVENTS_TOPIC, donation.getId().toString(), event);
		log.info("Published donation event to Kafka: campaignId={}", donation.getCampaignId());
	}

	@Override
	@Transactional
	public void completeDonation(DonationCompleteRequest request) {
		log.info("Completing donation from blockchain callback: donationId={}, campaignId={}", 
				request.donationId(), request.campaignId());

		// Idempotency check
		if (processEventRepository.existsById(request.donationId())) {
			log.warn("Donation already completed, skipping: {}", request.donationId());
			return;
		}

		// === JPA Transaction: Update donation status ===
		UUID donationId = UUID.fromString(request.donationId());
		Donation donation = donationRepository.findById(donationId)
				.orElseThrow(() -> new AppException(ErrorCode.DONATION_NOT_FOUND));

		donation.setPaymentStatus(PaymentStatus.COMPLETED);
		donation.setBlockchainTxHash(request.transactionHash());
		donationRepository.save(donation);

		// Mark event as processed (within same JPA transaction)
		processEventRepository.save(new ProcessEvent(request.donationId(), LocalDateTime.now()));
		log.info("JPA transaction committed: donationId={}", request.donationId());

		// === Non-transactional side effects (best-effort) ===
		// Read campaign BEFORE the atomic update to get current state
		Campaign campaign = campaignRepository.findById(request.campaignId()).orElse(null);

		// MongoDB: Update currentAmount atomically
		try {
			Query query = new Query(Criteria.where("id").is(request.campaignId()));
			Update update = new Update().inc("currentAmount", request.amount().doubleValue());
			mongoTemplate.updateFirst(query, update, Campaign.class);
			log.info("Updated MongoDB campaign currentAmount: campaignId={}", request.campaignId());
		} catch (Exception e) {
			log.error("Failed to update MongoDB currentAmount for campaign={}, manual reconciliation needed",
					request.campaignId(), e);
		}

		// Redis: Update cache atomically (avoid hasKey+increment race condition)
		try {
			String cacheKey = "campaign:" + request.campaignId() + ":amount";
			// Use increment directly — atomic, and avoids TOCTOU race with hasKey()
			// If key doesn't exist, Redis creates it with value 0, then increments
			Long result = redisTemplate.opsForValue().increment(cacheKey, request.amount().longValue());
			if (result != null && result == request.amount().longValue()) {
				// Key was just created by this increment (didn't exist before), remove it
				// to keep cache consistent — we only want to update existing cache entries
				redisTemplate.delete(cacheKey);
				log.debug("Redis key didn't exist, deleted auto-created key: {}", cacheKey);
			} else {
				log.info("Updated Redis cache atomically: key={}", cacheKey);
			}
		} catch (Exception e) {
			log.error("Failed to update Redis cache for campaign={}", request.campaignId(), e);
		}

		// WebSocket: Send real-time notifications
		try {
			if (campaign != null) {
				BigDecimal newCurrentAmount = campaign.getCurrentAmount().add(request.amount());
				Long donationCount = donationRepository.countByCampaignId(request.campaignId());

				CampaignStatsMessage statsMessage = new CampaignStatsMessage(
						request.campaignId(), newCurrentAmount, donationCount, request.donorName());
				webSocketService.sendCampaignStats(statsMessage);

				String description = String.format(
						"%s đã ủng hộ %s VND", request.donorName(), request.amount().longValue());
				CampaignActivityMessage activityMessage = new CampaignActivityMessage(
						request.campaignId(), "DONATION", description, Instant.now().toString());
				webSocketService.sendCampaignActivity(activityMessage);

				log.info("Sent WebSocket notifications for campaign: {}", request.campaignId());
			}
		} catch (Exception e) {
			log.error("Failed to send WebSocket notifications for campaign={}", request.campaignId(), e);
		}

		log.info("Donation completed successfully: donationId={}, txHash={}", 
				request.donationId(), request.transactionHash());
	}

	private String generatePaymentCode() {
		// Generate unique code: TS + timestamp + random
		return "TS" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
	}

	private String generateQRCodeUrl(BigDecimal amount, String paymentCode, String campaignTitle) {
		// VietQR format: bankId, accountNo, amount, description
		// https://img.vietqr.io/image/{bankId}-{accountNo}-{template}.png?amount={amount}&addInfo={description}
		String description = paymentCode + " " + campaignTitle;
		String encodedDescription = description.replace(" ", "%20");

		return String.format(
				"https://img.vietqr.io/image/%s-%s-compact.png?amount=%s&addInfo=%s",
				BANK_ID, ACCOUNT_NO, amount.longValue(), encodedDescription);
	}
}

