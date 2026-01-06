package com.nht.identity.dto.event;

import java.time.LocalDateTime;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KycAnalyzedEvent {
    private String kycId;
    private String userId;
    private ExtractedKycData extractedData;
    private Double confidence;
    private LocalDateTime timestamp;
}
