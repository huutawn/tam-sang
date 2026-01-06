package com.nht.identity.controller;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nht.identity.config.RsaKeyProperties;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * Controller to expose RSA public key for other services to verify JWT tokens
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PublicKeyController {

    RsaKeyProperties rsaKeyProperties;

    /**
     * Get RSA public key in PEM format
     * Other services can use this endpoint to retrieve the public key for JWT verification
     *
     * @return Public key in PEM format
     */
    @GetMapping("/public-key")
    public ResponseEntity<Map<String, String>> getPublicKey() {
        String publicKeyPem = convertPublicKeyToPem(rsaKeyProperties.publicKey().getEncoded());

        Map<String, String> response = new HashMap<>();
        response.put("publicKey", publicKeyPem);
        response.put("algorithm", "RS256");
        response.put("keyType", "RSA");

        return ResponseEntity.ok(response);
    }

    /**
     * Convert public key bytes to PEM format
     */
    private String convertPublicKeyToPem(byte[] keyBytes) {
        String base64Key = Base64.getEncoder().encodeToString(keyBytes);

        StringBuilder pem = new StringBuilder();
        pem.append("-----BEGIN PUBLIC KEY-----\n");

        // Split into 64-character lines
        int index = 0;
        while (index < base64Key.length()) {
            int endIndex = Math.min(index + 64, base64Key.length());
            pem.append(base64Key, index, endIndex).append("\n");
            index = endIndex;
        }

        pem.append("-----END PUBLIC KEY-----");

        return pem.toString();
    }
}
