package com.nht.identity.dto.request;

import jakarta.validation.constraints.Size;

import lombok.*;

public record AuthenticationRequest(
        @NonNull @Size(min = 4, message = "USERNAME_INVALID") String email, @NonNull String password) {}
