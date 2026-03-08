package com.nht.core_service.document;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.nht.core_service.enums.AiStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "proofs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Proof {

	@Id
	private String id;

	@Indexed
	private String withdrawalRequestId;

	private List<String> billImageUrls; // URL ảnh hóa đơn từ File Service
	private List<String> sceneImageUrls; // URL ảnh hiện trường từ File Service

	private String description;

	// AI Analysis Fields
	@Indexed
	@Builder.Default
	private AiStatus aiStatus = AiStatus.PROCESSING;

	private Integer aiScore; // 0-100

	private String aiAnalysis; // JSON string from AI Service

	// Community Review Fields
	@Builder.Default
	private Integer upvoteCount = 0;

	@Builder.Default
	private Integer reportCount = 0;

	private List<String> upvoterIds;
	private List<String> reporterIds;

	@CreatedDate
	private Instant createdAt;

	@LastModifiedDate
	private Instant updatedAt;
}
