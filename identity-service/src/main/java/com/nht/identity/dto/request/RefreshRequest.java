package com.nht.identity.dto.request;

public record RefreshRequest(String token, String refreshToken) {}
