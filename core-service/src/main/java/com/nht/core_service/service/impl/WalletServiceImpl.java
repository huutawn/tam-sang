package com.nht.core_service.service.impl;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nht.core_service.entity.Wallet;
import com.nht.core_service.enums.WalletStatus;
import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;
import com.nht.core_service.repository.jpa.WalletRepository;
import com.nht.core_service.service.WalletService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletServiceImpl implements WalletService {

	private final WalletRepository walletRepository;

	@Override
	@Transactional
	public Wallet createWallet(String campaignId) {
		if (walletRepository.existsByCampaignId(campaignId)) {
			throw new AppException(ErrorCode.WALLET_ALREADY_EXISTS);
		}

		Wallet wallet = Wallet.builder()
				.campaignId(campaignId)
				.balance(BigDecimal.ZERO)
				.status(WalletStatus.ACTIVE)
				.build();

		Wallet saved = walletRepository.save(wallet);
		log.info("Wallet created for campaign: {}", campaignId);
		return saved;
	}

	@Override
	public Wallet getWalletByCampaignId(String campaignId) {
		return walletRepository.findByCampaignId(campaignId).orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
	}

	@Override
	@Transactional
	public void updateBalance(UUID walletId, BigDecimal amount) {
		Wallet wallet =
				walletRepository.findById(walletId).orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));

		if (wallet.getStatus() == WalletStatus.LOCKED) {
			throw new AppException(ErrorCode.WALLET_LOCKED);
		}

		wallet.setBalance(wallet.getBalance().add(amount));
		walletRepository.save(wallet);
		log.info("Wallet balance updated: walletId={}, newBalance={}", walletId, wallet.getBalance());
	}

	@Override
	@Transactional
	public void lockWallet(UUID walletId) {
		Wallet wallet =
				walletRepository.findById(walletId).orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));

		wallet.setStatus(WalletStatus.LOCKED);
		walletRepository.save(wallet);
		log.info("Wallet locked: {}", walletId);
	}
}
