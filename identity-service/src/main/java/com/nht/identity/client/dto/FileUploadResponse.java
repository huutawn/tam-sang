package com.nht.identity.client.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {
    private String file_id;
    private String url;
    private String filename;
    private int size;
    private String contentType;
    private String checksum;
    private String uploaded_at;
}
