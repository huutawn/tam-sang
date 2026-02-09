package com.nht.core_service.client.dto;

/**
 * Response from identity-service KYC validation.
 */
public record ValidKycResponse(
    String userId,
    Boolean isValid,
    String message,
    String status,
    Boolean isError
) {}
