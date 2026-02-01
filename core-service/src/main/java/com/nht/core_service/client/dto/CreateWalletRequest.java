package com.nht.core_service.client.dto;

/**
 * Request to create a wallet in blockchain-service.
 */
public record CreateWalletRequest(
    String campaignId
) {}
