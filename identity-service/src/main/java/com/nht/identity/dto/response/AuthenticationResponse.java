package com.nht.identity.dto.response;

import java.util.Date;

public record AuthenticationResponse(String token, String refreshToken, Date expiryTime) {}
