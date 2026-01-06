package com.nht.core_service.service.impl;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nht.core_service.entity.TransactionError;
import com.nht.core_service.enums.ErrorStatus;
import com.nht.core_service.repository.jpa.TransactionErrorRepository;
import com.nht.core_service.service.TransactionErrorService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionErrorServiceImpl implements TransactionErrorService {

	private final TransactionErrorRepository transactionErrorRepository;

	@Override
	@Transactional
	public void logError(String campaignId, BigDecimal amount, String errorReason) {
		TransactionError error = TransactionError.builder()
				.resolvedCampaignId(campaignId)
				.amount(amount)
				.errorReason(errorReason)
				.status(ErrorStatus.PENDING)
				.build();

		transactionErrorRepository.save(error);
		log.error("Transaction error logged: campaignId={}, amount={}, reason={}", campaignId, amount, errorReason);
	}
}
