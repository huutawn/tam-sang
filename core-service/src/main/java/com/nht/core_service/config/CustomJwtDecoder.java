package com.nht.core_service.config;

import java.text.ParseException;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import com.nimbusds.jose.JOSEException;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class CustomJwtDecoder implements JwtDecoder {

    @Value("${jwt.public-key}")
    private String PUBLIC_KEY;

    private NimbusJwtDecoder nimbusJwtDecoder = null;

    @Override
    public Jwt decode(String token) throws JwtException {
        try {
            if (Objects.isNull(nimbusJwtDecoder)) {
                byte[] publicKeyBytes = java.util.Base64.getDecoder().decode(PUBLIC_KEY);
                java.security.KeyFactory keyFactory = java.security.KeyFactory.getInstance("RSA");
                java.security.spec.X509EncodedKeySpec keySpec = new java.security.spec.X509EncodedKeySpec(publicKeyBytes);
                java.security.PublicKey publicKey = keyFactory.generatePublic(keySpec);
                
                nimbusJwtDecoder = NimbusJwtDecoder.withPublicKey((java.security.interfaces.RSAPublicKey) publicKey)
                        .build();
            }

            return nimbusJwtDecoder.decode(token);
        } catch (Exception e) {
            log.error("Error decoding JWT token", e);
            throw new JwtException("Invalid token");
        }
    }
}
