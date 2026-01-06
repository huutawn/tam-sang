package com.nht.identity.dto.response;

import java.time.LocalDateTime;

import com.nht.identity.entity.KycStatus;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KycSubmitResponse {
    private String kycId;
    private String userId;
    private KycStatus status;
    private LocalDateTime createdAt;
}
