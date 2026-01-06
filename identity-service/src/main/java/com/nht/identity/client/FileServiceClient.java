package com.nht.identity.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import com.nht.identity.client.dto.ApiResponse;
import com.nht.identity.client.dto.FileUploadResponse;

@FeignClient(name = "file-service", path = "/api/v1/files")
public interface FileServiceClient {
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<FileUploadResponse> uploadFile(@RequestPart("file") MultipartFile file);
}
