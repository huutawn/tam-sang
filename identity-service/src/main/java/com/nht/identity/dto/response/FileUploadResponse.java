package com.nht.identity.dto.response;

public record FileUploadResponse(String filename, String originalFilename, String url, Long size, String contentType) {}
