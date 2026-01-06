package com.nht.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.web.multipart.MultipartFile;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KycSubmitRequest {
    @NotBlank(message = "User ID is required")
    private String userId;

    @NotNull(message = "Front image is required")
    private MultipartFile frontImage;

    @NotNull(message = "Back image is required")
    private MultipartFile backImage;
}
