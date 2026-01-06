package com.nht.core_service.service;

import java.math.BigDecimal;

public interface TransactionErrorService {

	void logError(String campaignId, BigDecimal amount, String errorReason);
}
