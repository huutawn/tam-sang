package com.nht.core_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class ProofUploadRequest {
    @NotBlank(message = "withdrawalRequestId is required")
    private String withdrawalRequestId;
    private List<String> billImageUrls;
    private List<String> sceneImageUrls;
    private String description;
}
