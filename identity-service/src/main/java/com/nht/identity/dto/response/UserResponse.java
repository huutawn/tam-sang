package com.nht.identity.dto.response;

import java.util.Set;

import com.nht.identity.entity.Role;

public record UserResponse(
        String id,
        String email,
        String firstName,
        String lastName,
        boolean isBlackList,
        String ICHash,
        String KycStatus,
        Set<Role> roles) {}
