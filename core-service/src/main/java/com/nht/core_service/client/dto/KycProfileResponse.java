package com.nht.core_service.client.dto;

import java.time.LocalDateTime;

/**
 * Response from identity-service KYC profile.
 * Used to get user details for contract signing.
 */
public record KycProfileResponse(
    String kycId,
    String userId,
    String frontImageUrl,
    String backImageUrl,
    String fullName,
    String dob,
    String idNumber,
    String idType,
    String address,
    String status,
    String rejectionReason,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
