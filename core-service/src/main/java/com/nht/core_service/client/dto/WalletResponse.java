package com.nht.core_service.client.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response from blockchain-service wallet operations.
 */
public record WalletResponse(
    String id,
    String campaignId,
    String address,
    String publicKey,
    BigDecimal balance,
    BigDecimal totalDeposits,
    BigDecimal totalWithdrawals,
    String currency,
    String status,
    boolean isVerified,
    LocalDateTime lastVerifiedAt,
    LocalDateTime createdAt
) {}
