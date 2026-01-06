package com.nht.core_service.dto.response;

import com.nht.core_service.enums.CampaignStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CampaignPageResponse (String id,
                                    String title,
                                    String content,
                                    BigDecimal targetAmount,
                                    BigDecimal usedAmount,
                                    BigDecimal currentAmount,
                                    List<String> images,
                                    CampaignStatus status,
                                    LocalDateTime startDate,
                                    LocalDateTime endDate,
                                    String ownerId,
                                    Boolean hasUsedQuickWithdrawal,
                                    Long likeCount,
                                    Long viewCount,
                                    Long commentCount){
}
