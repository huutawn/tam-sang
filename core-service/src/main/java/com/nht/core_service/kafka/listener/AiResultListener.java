package com.nht.core_service.kafka.listener;

import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.TopicSuffixingStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import com.nht.core_service.kafka.event.ProofVerificationResultEvent;
import com.nht.core_service.service.ProofService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiResultListener {
	
	private final ProofService proofService;
	
	@RetryableTopic(
		attempts = "3",
		backoff = @Backoff(delay = 1000, multiplier = 2.0),
		topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
		dltStrategy = org.springframework.kafka.retrytopic.DltStrategy.FAIL_ON_ERROR
	)
	@KafkaListener(topics = "proof-verification-result", groupId = "core-service-group")
	public void handleAiResult(ProofVerificationResultEvent event) {
		log.info("Received AI verification result for proof: {}", event.proofId());
		proofService.updateProofFromAiResult(event);
		log.info("Successfully processed AI result for proof: {}", event.proofId());
	}

	@DltHandler
	public void handleDlt(ProofVerificationResultEvent event) {
		log.error("AI result processing failed after all retries, sent to DLT: proofId={}", event.proofId());
		// Message is now in dead letter topic for manual inspection/reprocessing
	}
}

