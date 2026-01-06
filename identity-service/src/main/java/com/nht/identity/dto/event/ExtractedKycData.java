package com.nht.identity.dto.event;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractedKycData {
    private String fullName;
    private String dob;
    private String idNumber;
    private String idType;
    private String address;
}
