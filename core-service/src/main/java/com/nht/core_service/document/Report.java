package com.nht.core_service.document;

import java.time.Instant;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Report {

	@Id
	private String id;

	@Indexed
	private String campaignId;

	@Indexed
	private String reporterId;

	private String reason;

	private String evidence;

	@Builder.Default
	private String status = "PENDING";

	@CreatedDate
	private Instant createdAt;
}
