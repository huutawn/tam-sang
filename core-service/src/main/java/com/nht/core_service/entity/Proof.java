package com.nht.core_service.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import com.nht.core_service.enums.ProofStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "proof", indexes = {
	@Index(name = "idx_proof_campaign_id", columnList = "campaign_id"),
	@Index(name = "idx_proof_status", columnList = "status"),
	@Index(name = "idx_proof_ai_analysis_status", columnList = "ai_analysis_status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Proof {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "campaign_id", nullable = false)
	private String campaignId;

	@Column(name = "proof_images", columnDefinition = "TEXT[]", nullable = false)
	private String[] proofImages;

	@Column(name = "ai_analysis_result", columnDefinition = "TEXT")
	private String aiAnalysisResult;

	@Enumerated(EnumType.STRING)
	@Column(name = "ai_analysis_status", length = 20)
	@Builder.Default
	private ProofStatus aiAnalysisStatus = ProofStatus.PENDING;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	@Builder.Default
	private ProofStatus status = ProofStatus.PENDING;

	@Column(name = "submitted_at", nullable = false, updatable = false)
	private LocalDateTime submittedAt;

	@Column(name = "reviewed_at")
	private LocalDateTime reviewedAt;

	@Column(name = "reviewer_notes", columnDefinition = "TEXT")
	private String reviewerNotes;

	@PrePersist
	protected void onCreate() {
		submittedAt = LocalDateTime.now();
	}
}
