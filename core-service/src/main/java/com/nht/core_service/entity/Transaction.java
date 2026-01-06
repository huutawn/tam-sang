package com.nht.core_service.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import com.nht.core_service.enums.TransactionStatus;
import com.nht.core_service.enums.TransactionType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
		name = "transaction",
		indexes = {
			@Index(name = "idx_transaction_wallet_id", columnList = "wallet_id"),
			@Index(name = "idx_transaction_type", columnList = "type"),
			@Index(name = "idx_transaction_status", columnList = "status"),
			@Index(name = "idx_transaction_timestamp", columnList = "timestamp")
		})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "wallet_id", nullable = false)
	private Wallet wallet;
	private String previousHash;
	private String hash;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal amount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private TransactionType type;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	@Builder.Default
	private TransactionStatus status = TransactionStatus.PENDING;

	@Column(nullable = false)
	private LocalDateTime timestamp;

	@Column(columnDefinition = "TEXT")
	private String description;

	@PrePersist
	protected void onCreate() {
		if (timestamp == null) {
			timestamp = LocalDateTime.now();
		}
	}
}
