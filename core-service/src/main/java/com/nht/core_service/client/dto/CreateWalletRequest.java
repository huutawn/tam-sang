package com.nht.core_service.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request to create a wallet in blockchain-service.
 */
public record CreateWalletRequest(
    @JsonProperty("campaign_id")
    String campaignId
) {}
