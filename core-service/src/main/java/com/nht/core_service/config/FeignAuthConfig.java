package com.nht.core_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import feign.RequestInterceptor;

/**
 * Configures Feign clients to send X-Internal-API-Key header
 * for inter-service authentication with blockchain-service.
 */
@Configuration
public class FeignAuthConfig {

    @Value("${internal.api-key:}")
    private String internalApiKey;

    @Bean
    public RequestInterceptor internalApiKeyInterceptor() {
        return requestTemplate -> {
            if (internalApiKey != null && !internalApiKey.isEmpty()) {
                requestTemplate.header("X-Internal-API-Key", internalApiKey);
            }
        };
    }
}
