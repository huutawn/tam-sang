package com.nht.identity.dto.request;

import jakarta.validation.constraints.Size;

public record UserCreationRequest(
        @Size(min = 4, message = "USERNAME_INVALID") String email,
        @Size(min = 6, message = "INVALID_PASSWORD") String password,
        String firstName,
        String lastName) {}
