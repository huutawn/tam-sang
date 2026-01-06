package com.nht.core_service.document;

import java.time.Instant;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "interactions")
@CompoundIndex(def = "{'campaignId': 1, 'userId': 1, 'type': 1}", unique = true)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Interaction {

	@Id
	private String id;

	private String campaignId;

	private String userId;

	private String type; // "LIKE"

	@CreatedDate
	private Instant createdAt;
}
