package com.nht.core_service.kafka.producer;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.nht.core_service.kafka.event.HybridReasoningRequestEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Kafka producer for hybrid reasoning verification requests.
 * <p>
 * Publishes {@link HybridReasoningRequestEvent} to the
 * {@code hybrid-reasoning-request} topic, which is consumed by the AI-service.
 * Results are returned asynchronously via HTTP callback.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HybridReasoningProducer {
	
	private final KafkaTemplate<String, Object> kafkaTemplate;
	private static final String TOPIC = "hybrid-reasoning-request";
	
	/**
	 * Send a hybrid reasoning request to AI-service via Kafka.
	 *
	 * @param event the request event containing proof images and campaign context
	 */
	public void sendHybridReasoningRequest(HybridReasoningRequestEvent event) {
		log.info("Sending hybrid reasoning request for proofId: {}", event.proofId());
		
		kafkaTemplate.send(TOPIC, event.proofId(), event)
			.whenComplete((result, ex) -> {
				if (ex == null) {
					log.info("Successfully sent hybrid reasoning request: {} to partition: {}",
						event.proofId(), result.getRecordMetadata().partition());
				} else {
					log.error("Failed to send hybrid reasoning request: {}", event.proofId(), ex);
				}
			});
	}
}
