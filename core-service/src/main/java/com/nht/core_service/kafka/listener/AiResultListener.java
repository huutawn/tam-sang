package com.nht.core_service.kafka.listener;

import org.springframework.kafka.annotation.KafkaListener;
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
	
	@KafkaListener(topics = "proof-verification-result", groupId = "core-service-group")
	public void handleAiResult(ProofVerificationResultEvent event) {
		log.info("Received AI verification result for proof: {}", event.proofId());
		
		try {
			proofService.updateProofFromAiResult(event);
			log.info("Successfully processed AI result for proof: {}", event.proofId());
		} catch (Exception e) {
			log.error("Failed to process AI result for proof: {}", event.proofId(), e);
			// TODO: Implement retry logic or dead letter queue
		}
	}
}
