package com.nht.identity.dto.response;

import java.util.Set;

import com.nht.identity.entity.Role;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserWithKycResponse {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private boolean isBlackList;
    private String ICHash;
    private String KycStatus;
    private Set<Role> roles;
    private KycProfileResponse kycProfile;
}
