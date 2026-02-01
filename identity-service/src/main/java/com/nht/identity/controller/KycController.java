package com.nht.identity.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.nht.identity.client.dto.ApiResponse;
import com.nht.identity.dto.response.KycProfileResponse;
import com.nht.identity.dto.response.KycSubmitResponse;
import com.nht.identity.dto.response.ValidKycResponse;
import com.nht.identity.service.KycService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("kyc")
@RequiredArgsConstructor
@Slf4j
public class KycController {

    private final KycService kycService;

    @PostMapping(value = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<KycSubmitResponse> submitKyc(
            @RequestParam("userId") @NotBlank String userId,
            @RequestPart("frontImage") @NotNull MultipartFile frontImage,
            @RequestPart("backImage") @NotNull MultipartFile backImage) {

        log.info("Received KYC submission request for userId: {}", userId);

        KycSubmitResponse response = kycService.submitKyc(userId, frontImage, backImage);

        return ApiResponse.<KycSubmitResponse>builder()
                .code(1000)
                .message("KYC submission successful")
                .result(response)
                .build();
    }

    @GetMapping("/{kycId}")
    public ApiResponse<KycProfileResponse> getKycProfile(@PathVariable String kycId) {
        log.info("Received request to get KYC profile for kycId: {}", kycId);

        KycProfileResponse response = kycService.getKycProfile(kycId);

        return ApiResponse.<KycProfileResponse>builder()
                .code(1000)
                .result(response)
                .build();
    }

    @GetMapping("/valid/{userId}")
    public ApiResponse<ValidKycResponse> validKyc(@PathVariable String userId) {
        log.info("Received request to get KYC profile for userId: {}", userId);
        ValidKycResponse response = kycService.validKyc(userId);
        return ApiResponse.<ValidKycResponse>builder()
                .code(1000)
                .result(response)
                .build();
    }

    @GetMapping("/user/{userId}")
    public ApiResponse<KycProfileResponse> getKycProfileByUserId(@PathVariable String userId) {
        log.info("Received request to get KYC profile for userId: {}", userId);
        KycProfileResponse response = kycService.getKycProfileByUserId(userId);

        return ApiResponse.<KycProfileResponse>builder()
                .code(1000)
                .result(response)
                .build();
    }
}
