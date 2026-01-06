package com.nht.identity.service;

import org.springframework.web.multipart.MultipartFile;

import com.nht.identity.dto.response.KycProfileResponse;
import com.nht.identity.dto.response.KycSubmitResponse;

public interface KycService {
    KycSubmitResponse submitKyc(String userId, MultipartFile frontImage, MultipartFile backImage);

    KycProfileResponse getKycProfile(String kycId);

    KycProfileResponse getKycProfileByUserId(String userId);
}
