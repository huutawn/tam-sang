package com.nht.core_service.client;

import com.nht.core_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "identity-service", path = "/users")
public interface UserServiceClient {
    @GetMapping(value = "/exist")
    ApiResponse<UserDto> userExisted(@RequestParam("userEmail") String userEmail);

}
