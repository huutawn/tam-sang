package com.nht.identity.dto.response;

/**
 * Response DTO for KYC verification status check.
 * Used by other microservices to verify if a user has completed KYC.
 */
public record KycStatusResponse(boolean verified) {}
