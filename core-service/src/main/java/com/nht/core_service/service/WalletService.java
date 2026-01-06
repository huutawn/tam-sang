package com.nht.core_service.service;

import java.math.BigDecimal;
import java.util.UUID;

import com.nht.core_service.entity.Wallet;

public interface WalletService {

	Wallet createWallet(String campaignId);

	Wallet getWalletByCampaignId(String campaignId);

	void updateBalance(UUID walletId, BigDecimal amount);

	void lockWallet(UUID walletId);
}
