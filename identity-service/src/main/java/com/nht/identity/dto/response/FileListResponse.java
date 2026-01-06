package com.nht.identity.dto.response;

import java.util.List;

public record FileListResponse(List<FileMetadata> files, Integer totalCount) {}
