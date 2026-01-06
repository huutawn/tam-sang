package com.nht.identity.dto.response;

import java.time.LocalDateTime;

import com.nht.identity.entity.KycStatus;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KycProfileResponse {
    private String kycId;
    private String userId;
    private String frontImageUrl;
    private String backImageUrl;
    private String fullName;
    private String dob;
    private String idNumber;
    private String idType;
    private String address;
    private KycStatus status;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
