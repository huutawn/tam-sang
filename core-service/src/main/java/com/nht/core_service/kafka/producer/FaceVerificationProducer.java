package com.nht.core_service.kafka.producer;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.nht.core_service.kafka.event.FaceVerificationRequestEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class FaceVerificationProducer {
	
	private final KafkaTemplate<String, Object> kafkaTemplate;
	private static final String TOPIC = "face-verification-request";
	
	public void sendFaceVerificationRequest(FaceVerificationRequestEvent event) {
		log.info("Sending face verification request for withdrawalId: {}", event.withdrawalId());
		
		kafkaTemplate.send(TOPIC, event.withdrawalId(), event)
			.whenComplete((result, ex) -> {
				if (ex == null) {
					log.info("Successfully sent face verification request: {}", event.withdrawalId());
				} else {
					log.error("Failed to send face verification request: {}", event.withdrawalId(), ex);
				}
			});
	}
}
