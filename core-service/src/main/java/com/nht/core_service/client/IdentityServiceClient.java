package com.nht.core_service.client;

import com.nht.core_service.client.dto.KycProfileResponse;
import com.nht.core_service.client.dto.ValidKycResponse;
import com.nht.core_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign client for identity-service KYC operations.
 * Used to validate KYC status before campaign creation.
 */
@FeignClient(name = "identity-service", path = "/kyc")
public interface IdentityServiceClient {

    /**
     * Validate if a user has completed KYC verification.
     * Returns code + result format (no exception thrown).
     * @param userId the user ID
     * @return ApiResponse with ValidKycResponse containing isValid flag
     */
    @GetMapping("/valid/{userId}")
    ApiResponse<ValidKycResponse> validateKyc(@PathVariable String userId);

    /**
     * Get KYC profile by user ID.
     * Used to get user details for contract signing.
     * @param userId the user ID
     * @return ApiResponse with KycProfileResponse containing user details
     */
    @GetMapping("/user/{userId}")
    ApiResponse<KycProfileResponse> getKycProfileByUserId(@PathVariable String userId);
}
