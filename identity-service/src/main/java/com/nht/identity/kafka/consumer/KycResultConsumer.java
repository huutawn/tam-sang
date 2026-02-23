package com.nht.identity.kafka.consumer;

import java.util.Optional;

import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.TopicSuffixingStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import com.nht.identity.dto.event.KycAnalyzedEvent;
import com.nht.identity.entity.KycProfile;
import com.nht.identity.entity.KycStatus;
import com.nht.identity.repository.KycProfileRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class KycResultConsumer {

    private final KycProfileRepository kycProfileRepository;

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 1000, multiplier = 2.0),
            topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
            dltStrategy = org.springframework.kafka.retrytopic.DltStrategy.FAIL_ON_ERROR)
    @KafkaListener(
            topics = "${kafka.topics.kyc-result:kyc-result}",
            groupId = "${spring.kafka.consumer.group-id:identity-service-group}")
    public void consumeKycAnalyzedEvent(KycAnalyzedEvent event) {
        log.info("Received KycAnalyzedEvent for kycId: {}", event.getKycId());

        // Find the KYC profile
        Optional<KycProfile> kycProfileOpt = kycProfileRepository.findById(event.getKycId());

        if (kycProfileOpt.isEmpty()) {
            log.error("KYC profile not found for kycId: {}", event.getKycId());
            throw new IllegalStateException("KYC profile not found for kycId: " + event.getKycId());
        }

        KycProfile kycProfile = kycProfileOpt.get();

        // Check for duplicate ID number
        Optional<KycProfile> duplicateKyc = kycProfileRepository.findByIdNumberAndUserIdNot(
                event.getExtractedData().getIdNumber(), event.getUserId());

        if (duplicateKyc.isPresent()) {
            // Duplicate ID found - reject
            log.warn(
                    "Duplicate ID number found: {} for kycId: {}",
                    event.getExtractedData().getIdNumber(),
                    event.getKycId());
            kycProfile.setStatus(KycStatus.REJECTED);
            kycProfile.setRejectionReason("Duplicate Identity: ID number already registered for another user");
        } else {
            // No duplicate - update with extracted data
            log.info("No duplicate found, updating KYC profile with extracted data for kycId: {}", event.getKycId());
            kycProfile.setFullName(event.getExtractedData().getFullName());
            kycProfile.setDob(event.getExtractedData().getDob());
            kycProfile.setIdNumber(event.getExtractedData().getIdNumber());
            kycProfile.setIdType(event.getExtractedData().getIdType());
            kycProfile.setAddress(event.getExtractedData().getAddress());
            kycProfile.setStatus(KycStatus.APPROVED);
        }

        // Save updated profile
        kycProfileRepository.save(kycProfile);
        log.info(
                "Successfully updated KYC profile for kycId: {} with status: {}",
                event.getKycId(),
                kycProfile.getStatus());
    }

    @DltHandler
    public void handleDlt(KycAnalyzedEvent event) {
        log.error("KYC result processing failed after all retries, sent to DLT: kycId={}", event.getKycId());
    }
}
