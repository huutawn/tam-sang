package com.nht.core_service.document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.nht.core_service.enums.CampaignStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "campaigns")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Campaign {

	@Id
	private String id;

	@Indexed
	private String title;
	private String description;
	private String content;

	private BigDecimal targetAmount;
	private BigDecimal usedAmount;

	private BigDecimal currentAmount;
	private List<String> images;

	@Indexed
	@Builder.Default
	private CampaignStatus status = CampaignStatus.ACTIVE;

	private LocalDateTime startDate;

	private LocalDateTime endDate;

	@Indexed
	private String ownerId;

	// Quick withdrawal tracking
	@Builder.Default
	private Boolean hasUsedQuickWithdrawal = false;

	// Interaction counters (synced from Redis)
	@Builder.Default
	private Long likeCount = 0L;

	@Builder.Default
	private Long viewCount = 0L;

	@Builder.Default
	private Long commentCount = 0L;

	@CreatedDate
	private Instant createdAt;

	@LastModifiedDate
	private Instant updatedAt;

    private String getDescription;
}
