package com.nht.identity.kafka.producer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.nht.identity.dto.event.KycInitiatedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class KycEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.kyc-verification:kyc-verification}")
    private String kycVerificationTopic;
    //
    public void publishKycInitiatedEvent(KycInitiatedEvent event) {
        log.info("Publishing KycInitiatedEvent for kycId: {}", event.getKycId());
        kafkaTemplate.send(kycVerificationTopic, event.getKycId(), event).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish KycInitiatedEvent for kycId: {}", event.getKycId(), ex);
            } else {
                log.info(
                        "Successfully published KycInitiatedEvent for kycId: {} to topic: {}",
                        event.getKycId(),
                        kycVerificationTopic);
            }
        });
    }
}
