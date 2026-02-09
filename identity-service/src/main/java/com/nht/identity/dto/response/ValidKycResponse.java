package com.nht.identity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidKycResponse {
    private String userId;
    private Boolean isValid;
    private String message;
    private String status;
    private Boolean isError;
}
