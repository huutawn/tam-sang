package com.nht.identity.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.nht.identity.dto.request.UserCreationRequest;
import com.nht.identity.dto.response.ApiResponse;
import com.nht.identity.dto.response.KycStatusResponse;
import com.nht.identity.dto.response.UserExistResponse;
import com.nht.identity.dto.response.UserResponse;
import com.nht.identity.service.UserService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserController {
    UserService userService;

    @PostMapping
    public ApiResponse<UserResponse> register(@RequestBody @Valid UserCreationRequest request) {
        log.info("password in controller" + request.password() + " ... " + request.email());
        UserResponse result = userService.createUser(request);
        return new ApiResponse<>(1000, null, result);
    }

    @GetMapping
    public ApiResponse<List<UserResponse>> getAll() {
        List<UserResponse> result = userService.getUsers();
        return new ApiResponse<>(1000, null, result);
    }

    /**
     * Check if a user has completed KYC verification.
     * This endpoint is publicly accessible for other microservices to call.
     *
     * @param userId the user ID to check
     * @return KycStatusResponse with verified boolean
     */
    @GetMapping("/{userId}/kyc-status")
    public ApiResponse<KycStatusResponse> checkKycStatus(@PathVariable String userId) {
        boolean verified = userService.isUserKycVerified(userId);
        return new ApiResponse<>(1000, null, new KycStatusResponse(verified));
    }

    @GetMapping("/exist")
    public ApiResponse<UserExistResponse> checkExist(@RequestParam String userEmail) {
        UserExistResponse existed = userService.isUserExist(userEmail);
        return new ApiResponse<>(1000, null, existed);
    }
}
