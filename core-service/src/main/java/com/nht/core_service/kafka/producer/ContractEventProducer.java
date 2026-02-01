package com.nht.core_service.kafka.producer;

import com.nht.core_service.kafka.event.ContractSignRequestEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Kafka producer for contract-related events.
 * Publishes events to blockchain-service for contract signing.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ContractEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.contract-sign-request:contract-sign-request}")
    private String contractSignRequestTopic;

    /**
     * Publishes a contract sign request event to Kafka.
     *
     * @param campaignId Campaign ID
     * @param campaignName Campaign name/title
     * @param description Campaign description
     * @param targetAmount Target donation amount
     * @param currency Currency code
     * @param startDate Campaign start date
     * @param endDate Campaign end date
     * @param organizerId Organizer user ID
     * @param organizerName Organizer full name from KYC
     * @param organizerIdNumber Organizer ID number from KYC
     */
    public void publishContractSignRequest(
            String campaignId,
            String campaignName,
            String description,
            BigDecimal targetAmount,
            String currency,
            LocalDate startDate,
            LocalDate endDate,
            String organizerId,
            String organizerName,
            String organizerIdNumber
    ) {
        ContractSignRequestEvent event = new ContractSignRequestEvent(
                campaignId,
                campaignName,
                description,
                targetAmount,
                currency,
                startDate,
                endDate,
                organizerId,
                organizerName,
                organizerIdNumber
        );

        log.info("Publishing contract sign request: campaignId={}, organizerName={}", 
                campaignId, organizerName);

        try {
            kafkaTemplate.send(contractSignRequestTopic, campaignId, event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("Failed to send contract sign request: campaignId={}", 
                                    campaignId, ex);
                        } else {
                            log.info("Contract sign request sent successfully: campaignId={}, offset={}", 
                                    campaignId, result.getRecordMetadata().offset());
                        }
                    });
        } catch (Exception e) {
            log.error("Exception publishing contract sign request: campaignId={}", campaignId, e);
            throw e;
        }
    }
}
