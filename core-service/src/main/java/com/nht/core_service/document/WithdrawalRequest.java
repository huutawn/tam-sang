package com.nht.core_service.document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.nht.core_service.enums.WithdrawalStatus;
import com.nht.core_service.enums.WithdrawalType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "withdrawal_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawalRequest {

	@Id
	private String id;

	@Indexed
	private String campaignId;

	private BigDecimal amount;

	private String reason;
	
	private String bankAccount;  // Bank account for fund transfer

	@Builder.Default
	private WithdrawalType type = WithdrawalType.STANDARD;

	// Quick withdrawal flag
	@Builder.Default
	private Boolean quick = false;
	private String aiAnalysisResult;

	@Indexed
	@Builder.Default
	private WithdrawalStatus status = WithdrawalStatus.PENDING;

	@CreatedDate
	private Instant createdAt;

	@LastModifiedDate
	private Instant updatedAt;
}
