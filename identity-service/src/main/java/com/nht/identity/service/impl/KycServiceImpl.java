package com.nht.identity.service.impl;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.nht.identity.client.FileServiceClient;
import com.nht.identity.client.dto.ApiResponse;
import com.nht.identity.client.dto.FileUploadResponse;
import com.nht.identity.dto.event.KycInitiatedEvent;
import com.nht.identity.dto.response.KycProfileResponse;
import com.nht.identity.dto.response.KycSubmitResponse;
import com.nht.identity.entity.KycProfile;
import com.nht.identity.entity.KycStatus;
import com.nht.identity.exception.AppException;
import com.nht.identity.exception.ErrorCode;
import com.nht.identity.kafka.producer.KycEventProducer;
import com.nht.identity.repository.KycProfileRepository;
import com.nht.identity.repository.UserRepository;
import com.nht.identity.service.KycService;

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

        // Validate user exists
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOT_EXISTED);
        }

        // Upload front image to File Service
        log.info("Uploading front image for userId: {}", userId);
        ApiResponse<FileUploadResponse> frontResponse = fileServiceClient.uploadFile(frontImage);
        String frontImageUrl = frontResponse.getResult().getFileUrl();

        // Upload back image to File Service
        log.info("Uploading back image for userId: {}", userId);
        ApiResponse<FileUploadResponse> backResponse = fileServiceClient.uploadFile(backImage);
        String backImageUrl = backResponse.getResult().getFileUrl();

        // Create KYC profile with PENDING status
        KycProfile kycProfile = KycProfile.builder()
                .userId(userId)
                .frontImageUrl(frontImageUrl)
                .backImageUrl(backImageUrl)
                .status(KycStatus.PENDING)
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
                .status(KycStatus.PENDING)
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
