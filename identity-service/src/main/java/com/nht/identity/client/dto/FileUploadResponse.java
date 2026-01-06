package com.nht.identity.client.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {
    private String fileId;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String mimeType;
}
