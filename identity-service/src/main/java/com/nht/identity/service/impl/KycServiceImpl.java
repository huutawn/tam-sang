package com.nht.identity.service.impl;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.nht.identity.client.FileServiceClient;
import com.nht.identity.client.dto.FileUploadResponse;
import com.nht.identity.client.dto.Response;
import com.nht.identity.dto.event.KycInitiatedEvent;
import com.nht.identity.dto.response.KycProfileResponse;
import com.nht.identity.dto.response.KycSubmitResponse;
import com.nht.identity.dto.response.ValidKycResponse;
import com.nht.identity.entity.KycProfile;
import com.nht.identity.entity.KycStatus;
import com.nht.identity.entity.User;
import com.nht.identity.exception.AppException;
import com.nht.identity.exception.ErrorCode;
import com.nht.identity.kafka.producer.KycEventProducer;
import com.nht.identity.repository.KycProfileRepository;
import com.nht.identity.repository.UserRepository;
import com.nht.identity.service.KycService;
import com.nht.identity.utils.SecurityUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class KycServiceImpl implements KycService {

    private final KycProfileRepository kycProfileRepository;
    private final UserRepository userRepository;
    private final FileServiceClient fileServiceClient;
    private final KycEventProducer kycEventProducer;

    @Override
    @Transactional
    public KycSubmitResponse submitKyc(String userId, MultipartFile frontImage, MultipartFile backImage) {
        log.info("Submitting KYC for userId: {}", userId);
        if (userId == null) {
            String email = SecurityUtils.getCurrentUserJwt().get();
            userId = userRepository
                    .findByEmail(email)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED))
                    .getId();
        }

        // Upload front image to File Service
        log.info("Uploading front image for userId: {}", userId);
        Response<FileUploadResponse> frontResponse = fileServiceClient.uploadFile(frontImage);
        String frontImageUrl = frontResponse.getData().getUrl();

        // Upload back image to File Service
        log.info("Uploading back image for userId: {}", userId);
        Response<FileUploadResponse> backResponse = fileServiceClient.uploadFile(backImage);
        String backImageUrl = backResponse.getData().getUrl();

        // Create KYC profile with PENDING status
        KycProfile kycProfile = KycProfile.builder()
                .userId(userId)
                .frontImageUrl(frontImageUrl)
                .backImageUrl(backImageUrl)
                .status(KycStatus.APPROVED)
                .build();

        kycProfile = kycProfileRepository.save(kycProfile);
        log.info("Created KYC profile with id: {} for userId: {}", kycProfile.getId(), userId);

        // Publish Kafka event for AI processing
        KycInitiatedEvent event = KycInitiatedEvent.builder()
                .kycId(kycProfile.getId())
                .userId(userId)
                .frontImageUrl(frontImageUrl)
                .backImageUrl(backImageUrl)
                .timestamp(LocalDateTime.now())
                .build();

        kycEventProducer.publishKycInitiatedEvent(event);

        // Return response
        return KycSubmitResponse.builder()
                .kycId(kycProfile.getId())
                .userId(userId)
                .status(kycProfile.getStatus())
                .createdAt(kycProfile.getCreatedAt())
                .build();
    }

    @Override
    public KycProfileResponse getKycProfile(String kycId) {
        log.info("Getting KYC profile for kycId: {}", kycId);

        KycProfile kycProfile =
                kycProfileRepository.findById(kycId).orElseThrow(() -> new AppException(ErrorCode.KYC_NOT_FOUND));

        return mapToResponse(kycProfile);
    }

    @Override
    public KycProfileResponse getKycProfileByUserId(String userId) {
        log.info("Getting KYC profile for userId: {}", userId);

        KycProfile kycProfile =
                kycProfileRepository.findByUserId(userId).orElseThrow(() -> new AppException(ErrorCode.KYC_NOT_FOUND));

        return mapToResponse(kycProfile);
    }

    @Override
    public ValidKycResponse validKyc(String userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            return ValidKycResponse.builder()
                    .isValid(false)
                    .isError(true)
                    .status("User not found")
                    .message("User not found")
                    .build();
        } else {

            if (user.get().getKycProfile() == null) {
                return ValidKycResponse.builder()
                        .isValid(false)
                        .isError(true)
                        .status("not have Kyc")
                        .build();
            } else if (!user.get().getKycProfile().getStatus().equals(KycStatus.APPROVED)) {
                return ValidKycResponse.builder()
                        .isError(true)
                        .isValid(false)
                        .status("Kyc not approved")
                        .build();
            }
        }

        log.info("kyc valid true");
        return ValidKycResponse.builder()
                .isError(false)
                .isValid(true)
                .userId(userId)
                .status("Kyc approved")
                .build();
    }

    private KycProfileResponse mapToResponse(KycProfile kycProfile) {
        return KycProfileResponse.builder()
                .kycId(kycProfile.getId())
                .userId(kycProfile.getUserId())
                .frontImageUrl(kycProfile.getFrontImageUrl())
                .backImageUrl(kycProfile.getBackImageUrl())
                .fullName(kycProfile.getFullName())
                .dob(kycProfile.getDob())
                .idNumber(kycProfile.getIdNumber())
                .idType(kycProfile.getIdType())
                .address(kycProfile.getAddress())
                .status(kycProfile.getStatus())
                .rejectionReason(kycProfile.getRejectionReason())
                .createdAt(kycProfile.getCreatedAt())
                .updatedAt(kycProfile.getUpdatedAt())
                .build();
    }
}
