package com.nht.core_service.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import com.nht.core_service.enums.PaymentStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "donation", indexes = {
	@Index(name = "idx_donation_campaign_id", columnList = "campaign_id"),
	@Index(name = "idx_donation_payment_status", columnList = "payment_status"),
	@Index(name = "idx_donation_payos_transaction_id", columnList = "payos_transaction_id"),
	@Index(name = "idx_donation_payment_code", columnList = "payment_code", unique = true),
	@Index(name = "idx_donation_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Donation {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "campaign_id", nullable = false)
	private String campaignId;



	@Column(name = "donor_full_name", nullable = false)
	private String donorFullName;

	@Column(name = "donor_email")
	private String donorEmail;

	@Column(name = "donor_phone", length = 50)
	private String donorPhone;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal amount;

	@Column(columnDefinition = "TEXT")
	private String content;

	@Column(name = "bank_name", length = 100)
	private String bankName;

	@Column(name = "bank_number", length = 100)
	private String bankNumber;

	@Column(name = "payment_method", nullable = false, length = 50)
	private String paymentMethod;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_status", nullable = false, length = 20)
	@Builder.Default
	private PaymentStatus paymentStatus = PaymentStatus.PENDING;

	@Column(name = "payos_transaction_id")
	private String payosTransactionId;

	@Column(name = "payment_code", nullable = false, unique = true)
	private String paymentCode;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "blockchain_tx_hash")
	private String blockchainTxHash;

	@PrePersist
	protected void onCreate() {
		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}
}
