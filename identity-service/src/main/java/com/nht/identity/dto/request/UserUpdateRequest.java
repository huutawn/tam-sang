package com.nht.identity.dto.request;

import java.util.List;

public record UserUpdateRequest(String password, String firstName, String lastName, List<String> roles) {}
