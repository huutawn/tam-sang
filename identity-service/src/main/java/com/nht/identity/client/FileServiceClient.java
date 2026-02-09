package com.nht.identity.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import com.nht.identity.client.dto.FileUploadResponse;
import com.nht.identity.client.dto.Response;

@FeignClient(name = "file-service", path = "/files")
public interface FileServiceClient {
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    Response<FileUploadResponse> uploadFile(@RequestPart("file") MultipartFile file);
}
