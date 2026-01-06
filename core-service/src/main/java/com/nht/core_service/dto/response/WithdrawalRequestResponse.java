package com.nht.core_service.dto.response;

import com.nht.core_service.enums.WithdrawalStatus;
import com.nht.core_service.enums.WithdrawalType;
import org.apache.kafka.common.protocol.types.Field;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public record WithdrawalRequestResponse (String id,
                                         String campaignId,
                                         BigDecimal amount,
                                         String reason,
                                         String bankAccount,
                                         WithdrawalType type,
                                         Boolean quick,
                                         String aiAnalysisResult,
                                         WithdrawalStatus status,
                                         Instant createdAt
){
}
