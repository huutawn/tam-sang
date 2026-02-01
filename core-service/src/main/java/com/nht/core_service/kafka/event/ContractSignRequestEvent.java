package com.nht.core_service.kafka.event;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Kafka event for requesting contract signing in blockchain-service.
 * Published after successful campaign and wallet creation.
 */
public record ContractSignRequestEvent(
    String eventType,
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
    public static final String EVENT_TYPE = "contract-sign-request";
    
    public ContractSignRequestEvent(
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
        this(EVENT_TYPE, campaignId, campaignName, description, targetAmount, currency,
                startDate, endDate, organizerId, organizerName, organizerIdNumber);
    }
}
