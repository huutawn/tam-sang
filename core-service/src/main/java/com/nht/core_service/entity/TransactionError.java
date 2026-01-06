package com.nht.core_service.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import com.nht.core_service.enums.ErrorStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "transaction_error", indexes = {
	@Index(name = "idx_transaction_error_status", columnList = "status"),
	@Index(name = "idx_transaction_error_transaction_code", columnList = "transaction_code")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionError {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal amount;

	@Column(name = "sender_bank_name", length = 100)
	private String senderBankName;

	@Column(name = "sender_bank_number", length = 100)
	private String senderBankNumber;

	@Column(name = "sender_name")
	private String senderName;

	@Column(name = "transaction_code")
	private String transactionCode;

	@Column(columnDefinition = "TEXT")
	private String content;

	@Column(name = "error_reason", columnDefinition = "TEXT", nullable = false)
	private String errorReason;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	@Builder.Default
	private ErrorStatus status = ErrorStatus.PENDING;

	@Column(name = "resolved_campaign_id")
	private String resolvedCampaignId;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	@PrePersist
	protected void onCreate() {
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
	}

	@PreUpdate
	protected void onUpdate() {
		updatedAt = LocalDateTime.now();
	}
}
