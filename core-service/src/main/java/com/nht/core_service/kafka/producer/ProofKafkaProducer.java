package com.nht.core_service.kafka.producer;

import java.util.Map;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.nht.core_service.kafka.event.ProofVerificationRequestEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProofKafkaProducer {
	
	private final KafkaTemplate<String, Object> kafkaTemplate;
	private static final String TOPIC = "proof-verification-request";
	
	public void sendProofVerificationRequest(ProofVerificationRequestEvent event) {
		log.info("Sending proof verification request for proofId: {}", event.proofId());
		
		kafkaTemplate.send(TOPIC, event.proofId(), event)
			.whenComplete((result, ex) -> {
				if (ex == null) {
					log.info("Successfully sent proof verification request: {}", event.proofId());
				} else {
					log.error("Failed to send proof verification request: {}", event.proofId(), ex);
				}
			});
	}
}
