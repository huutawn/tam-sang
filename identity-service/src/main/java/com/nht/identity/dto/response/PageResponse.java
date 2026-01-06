package com.nht.identity.dto.response;

import java.util.Collections;
import java.util.List;

public record PageResponse<T>(
        int currentPage, // trang hiện tại
        int totalPages, // tổng số trang
        int pageSize, // size của trang là bao nhiêu
        long totalElements, // tổng số phần tử, element
        List<T> data) {

    public PageResponse {
        if (data == null) {
            data = Collections.emptyList();
        }
    }

    public PageResponse(int currentPage, int totalPages, int pageSize, long totalElements) {
        this(currentPage, totalPages, pageSize, totalElements, Collections.emptyList());
    }
}
