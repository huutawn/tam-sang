package com.nht.core_service.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nht.core_service.config.KafkaTopicConfig;
import com.nht.core_service.document.Campaign;
import com.nht.core_service.dto.event.DonationEvent;
import com.nht.core_service.dto.request.InitDonationRequest;
import com.nht.core_service.dto.request.PaymentWebhookRequest;
import com.nht.core_service.entity.Donation;
import com.nht.core_service.entity.Transaction;
import com.nht.core_service.entity.Wallet;
import com.nht.core_service.enums.PaymentStatus;
import com.nht.core_service.enums.TransactionStatus;
import com.nht.core_service.enums.TransactionType;
import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;
import com.nht.core_service.repository.jpa.DonationRepository;
import com.nht.core_service.repository.jpa.TransactionRepository;
import com.nht.core_service.repository.mongodb.CampaignRepository;
import com.nht.core_service.service.DonationService;
import com.nht.core_service.service.WalletService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.payos.PayOS;
import vn.payos.type.CheckoutResponseData;
import vn.payos.type.PaymentData;

@Service
@RequiredArgsConstructor
@Slf4j
public class DonationServiceImpl implements DonationService {

	private final DonationRepository donationRepository;
	private final CampaignRepository campaignRepository;
	private final KafkaTemplate<String, Object> kafkaTemplate;
	private final PayOS payOS;
	@Value("${secret-key}")
	private String secretKey;
	private static final String BANK_ID = "970422"; // VietQR MB Bank
	private static final String ACCOUNT_NO = "0962974546"; // Example account
	private static final String ACCOUNT_NAME = "TAM SANG CHARITY";

	@Override
	@Transactional
	public CheckoutResponseData initializeDonation(InitDonationRequest request) {
		// Verify campaign exists
		Campaign campaign = campaignRepository
				.findById(request.campaignId())
				.orElseThrow(() -> new AppException(ErrorCode.CAMPAIGN_NOT_FOUND));
		BigDecimal remaining = campaign.getTargetAmount().subtract(campaign.getCurrentAmount());
		BigDecimal amount = request.amount();
		if (request.amount().compareTo(remaining) > 0) {
			amount=remaining;
		}
		// Generate unique payment code
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
		PaymentData paymentData = PaymentData.builder()
				.orderCode(System.currentTimeMillis())
				.amount(Integer.parseInt(amount.toString()))
				.description(request.message())
				.returnUrl("http://localhost:3000/success") // URL khi khách trả tiền xong
				.cancelUrl("http://localhost:3000/cancel") //
				.build();
		try {
			return payOS.createPaymentLink(paymentData);
		} catch (Exception e) {
			e.printStackTrace();
			return null;
		}
	}
	private String calculateHash(String previousHash, String amount, String walletId, String timestamp){
		StringBuilder dataToHash = new StringBuilder();
		dataToHash.append(previousHash);
		dataToHash.append(amount);
		dataToHash.append(walletId);
		dataToHash.append(timestamp);
		dataToHash.append(secretKey);
		String sha256hex = DigestUtils.sha256Hex(dataToHash.toString());
		return sha256hex;
	}


	@Override
	@Transactional
	public void processPaymentWebhook(PaymentWebhookRequest request) {
		// Find donation by payment code
		Donation donation = donationRepository
				.findByPaymentCode(request.paymentCode())
				.orElseThrow(() -> new AppException(ErrorCode.DONATION_NOT_FOUND));

		// Validate amount
		if (donation.getAmount().compareTo(request.amount()) != 0) {
			log.error(
					"Payment amount mismatch: expected={}, received={}",
					donation.getAmount(),
					request.amount());
			throw new AppException(ErrorCode.INVALID_DONATION_AMOUNT);
		}

		// Check if already processed
		if (donation.getPaymentStatus() == PaymentStatus.COMPLETED) {
			log.warn("Donation already processed: {}", donation.getId());
			return;
		}

		// Update donation status
		donation.setPaymentStatus(PaymentStatus.COMPLETED);
		donationRepository.save(donation);
		log.info("Donation completed: id={}, amount={}", donation.getId(), donation.getAmount());

		// Get wallet and create transaction
		Wallet wallet = walletService.getWalletByCampaignId(donation.getCampaignId());

		Transaction transaction = Transaction.builder()
				.wallet(wallet)
				.amount(donation.getAmount())
				.type(TransactionType.DEPOSIT)
				.status(TransactionStatus.COMPLETED)
				.description("Donation from " + donation.getDonorFullName())
				.timestamp(LocalDateTime.now())
				.build();
		Optional<Transaction> firstTransaction = transactionRepository.findTopByOrderByTimestampDesc();

		if(firstTransaction.isEmpty()){
			transaction.setPreviousHash("firsHash1290034u1dbf");
		}else{
			transaction.setPreviousHash(firstTransaction.get().getHash());
		}
		String hash = calculateHash(transaction.getPreviousHash(),transaction.getAmount().toString(),transaction.getWallet().getId().toString(),transaction.getTimestamp().toString());
		transaction.setHash(hash);

		Transaction savedTransaction = transactionRepository.save(transaction);
		log.info("Transaction created: id={}, amount={}", savedTransaction.getId(), savedTransaction.getAmount());

		// Update wallet balance
		walletService.updateBalance(wallet.getId(), donation.getAmount());

		// Link transaction to donation
		donation.setTransaction(savedTransaction);
		donationRepository.save(donation);

		// Publish event to Kafka
		DonationEvent event = new DonationEvent(donation.getId(),
				donation.getCampaignId(), donation.getAmount(), donation.getDonorFullName(), donation.getContent());

		kafkaTemplate.send(KafkaTopicConfig.DONATION_EVENTS_TOPIC, event);
		log.info("Published donation event to Kafka: campaignId={}", donation.getCampaignId());
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
