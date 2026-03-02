package com.nht.core_service.dto.response;

import com.nht.core_service.enums.FaceVerificationStatus;
import com.nht.core_service.enums.WithdrawalStatus;
import com.nht.core_service.enums.WithdrawalType;

import java.math.BigDecimal;
import java.time.Instant;

public record WithdrawalRequestResponse (String id,
                                         String campaignId,
                                         BigDecimal amount,
                                         String reason,
                                         String bankAccount,
                                         WithdrawalType type,
                                         Boolean quick,
                                         String aiAnalysisResult,
                                         String selfieImageUrl,
                                         FaceVerificationStatus faceVerificationStatus,
                                         String faceVerificationLog,
                                         WithdrawalStatus status,
                                         Instant createdAt
){
}
