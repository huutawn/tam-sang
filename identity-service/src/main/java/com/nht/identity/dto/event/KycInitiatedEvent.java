package com.nht.identity.dto.event;

import java.time.LocalDateTime;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KycInitiatedEvent {
    private String kycId;
    private String userId;
    private String frontImageUrl;
    private String backImageUrl;
    private LocalDateTime timestamp;
}
