package com.nht.identity.config;

import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;

/**
 * Configuration class that converts PEM-formatted RSA keys from YAML
 * into Java RSAPrivateKey and RSAPublicKey objects.
 */
@Configuration
@Slf4j
public class RsaKeyConverter {

    @Bean
    @ConfigurationProperties(prefix = "jwt")
    public RsaKeyConfigProperties rsaKeyConfigProperties() {
        return new RsaKeyConfigProperties();
    }

    @Bean
    public RsaKeyProperties rsaKeyProperties(RsaKeyConfigProperties configProperties) {
        try {
            log.info("Loading RSA keys from configuration...");

            if (configProperties.getPrivateKey() == null
                    || configProperties.getPrivateKey().isEmpty()) {
                throw new IllegalStateException("Private key is null or empty in configuration");
            }
            if (configProperties.getPublicKey() == null
                    || configProperties.getPublicKey().isEmpty()) {
                throw new IllegalStateException("Public key is null or empty in configuration");
            }

            // Parse private key
            RSAPrivateKey privateKey = parsePrivateKey(configProperties.getPrivateKey());
            log.info("Successfully parsed private key");

            // Parse public key
            RSAPublicKey publicKey = parsePublicKey(configProperties.getPublicKey());
            log.info("Successfully parsed public key");

            return new RsaKeyProperties(
                    privateKey,
                    publicKey,
                    configProperties.getValidDuration(),
                    configProperties.getRefreshableDuration());
        } catch (Exception e) {
            log.error("Failed to parse RSA keys from configuration", e);
            throw new IllegalStateException("Failed to parse RSA keys from configuration: " + e.getMessage(), e);
        }
    }

    private String cleanKey(String key) {
        log.debug("Original key length: {}", key.length());

        // 1. Remove surrounding quotes if present (common in .env files)
        if (key.startsWith("\"") && key.endsWith("\"")) {
            key = key.substring(1, key.length() - 1);
        }

        // 2. Remove PEM headers and footers
        key = key.replaceAll("-----BEGIN.*?-----", "").replaceAll("-----END.*?-----", "");

        // 3. Remove all whitespace characters (spaces, newlines, tabs, etc.)
        key = key.replaceAll("\\s+", "");

        // 4. Remove any remaining non-Base64 characters (but keep padding '=')
        key = key.replaceAll("[^A-Za-z0-9+/=]", "");

        // 5. Ensure proper Base64 padding (length must be multiple of 4)
        int paddingNeeded = (4 - (key.length() % 4)) % 4;
        if (paddingNeeded > 0) {
            key = key + "=".repeat(paddingNeeded);
            log.debug("Added {} padding characters", paddingNeeded);
        }

        log.debug("Cleaned key length: {} (should be multiple of 4)", key.length());

        return key;
    }

    private RSAPrivateKey parsePrivateKey(String pemKey) throws Exception {
        try {
            String privateKeyPEM = cleanKey(pemKey);
            log.debug("Attempting to decode Base64 private key of length: {}", privateKeyPEM.length());
            log.debug("First 50 chars: {}", privateKeyPEM.substring(0, Math.min(50, privateKeyPEM.length())));

            byte[] encoded = Base64.getDecoder().decode(privateKeyPEM);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
            return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
        } catch (Exception e) {
            log.error("Failed to parse private key. Input length: {}", pemKey.length());
            log.error("Error details: {}", e.getMessage());
            throw e;
        }
    }

    private RSAPublicKey parsePublicKey(String pemKey) throws Exception {
        try {
            String publicKeyPEM = cleanKey(pemKey);
            byte[] encoded = Base64.getDecoder().decode(publicKeyPEM);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(encoded);
            return (RSAPublicKey) keyFactory.generatePublic(keySpec);
        } catch (Exception e) {
            log.error("Failed to parse public key.", e);
            throw e;
        }
    }

    @Data
    public static class RsaKeyConfigProperties {
        private String privateKey;
        private String publicKey;
        private long validDuration;
        private long refreshableDuration;
    }
}
