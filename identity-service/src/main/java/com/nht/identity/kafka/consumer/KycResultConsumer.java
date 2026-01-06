package com.nht.identity.kafka.consumer;

import java.util.Optional;

import org.springframework.kafka.annotation.KafkaListener;
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

    @KafkaListener(
            topics = "${kafka.topics.kyc-result:kyc-result}",
            groupId = "${spring.kafka.consumer.group-id:identity-service-group}")
    public void consumeKycAnalyzedEvent(KycAnalyzedEvent event) {
        log.info("Received KycAnalyzedEvent for kycId: {}", event.getKycId());

        try {
            // Find the KYC profile
            Optional<KycProfile> kycProfileOpt = kycProfileRepository.findById(event.getKycId());

            if (kycProfileOpt.isEmpty()) {
                log.error("KYC profile not found for kycId: {}", event.getKycId());
                return;
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
                log.info(
                        "No duplicate found, updating KYC profile with extracted data for kycId: {}", event.getKycId());
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

        } catch (Exception e) {
            log.error("Error processing KycAnalyzedEvent for kycId: {}", event.getKycId(), e);
        }
    }
}
