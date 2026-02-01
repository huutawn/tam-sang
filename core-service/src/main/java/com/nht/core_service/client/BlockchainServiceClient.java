package com.nht.core_service.client;

import com.nht.core_service.client.dto.CreateWalletRequest;
import com.nht.core_service.client.dto.WalletResponse;
import com.nht.core_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

/**
 * Feign client for blockchain-service wallet operations.
 * All responses return code + result format (no HTTP exceptions for business logic).
 */
@FeignClient(name = "blockchain-service", path = "/v1/wallets")
public interface BlockchainServiceClient {

    /**
     * Create a new wallet for a campaign.
     * @param request wallet creation request with campaignId
     * @return ApiResponse with code (0=success) and WalletResponse
     */
    @PostMapping
    ApiResponse<WalletResponse> createWallet(@RequestBody CreateWalletRequest request);

    /**
     * Get wallet by wallet ID.
     * @param walletId the wallet ID
     * @return ApiResponse with code and WalletResponse
     */
    @GetMapping("/{walletId}")
    ApiResponse<WalletResponse> getWallet(@PathVariable String walletId);

    /**
     * Get wallet by campaign ID.
     * @param campaignId the campaign ID
     * @return ApiResponse with code and WalletResponse
     */
    @GetMapping("/campaign/{campaignId}")
    ApiResponse<WalletResponse> getWalletByCampaign(@PathVariable String campaignId);

    /**
     * Delete wallet by wallet ID (for saga rollback).
     * @param walletId the wallet ID
     * @return ApiResponse with code (0=success)
     */
    @DeleteMapping("/{walletId}")
    ApiResponse<Void> deleteWallet(@PathVariable String walletId);

    /**
     * Delete wallet by campaign ID (for saga rollback).
     * @param campaignId the campaign ID
     * @return ApiResponse with code (0=success)
     */
    @DeleteMapping("/campaign/{campaignId}")
    ApiResponse<Void> deleteWalletByCampaign(@PathVariable String campaignId);

    /**
     * Freeze a wallet.
     * @param walletId the wallet ID
     * @return ApiResponse with code (0=success)
     */
    @PostMapping("/{walletId}/freeze")
    ApiResponse<Void> freezeWallet(@PathVariable String walletId);

    /**
     * Unfreeze a wallet.
     * @param walletId the wallet ID
     * @return ApiResponse with code (0=success)
     */
    @PostMapping("/{walletId}/unfreeze")
    ApiResponse<Void> unfreezeWallet(@PathVariable String walletId);
}
