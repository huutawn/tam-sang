package com.nht.identity.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(int code, String message, T result) {
    public ApiResponse {
        if (code == 0) {
            code = 1000;
        }
    }

    public ApiResponse(String message, T result) {
        this(1000, message, result);
    }
}
