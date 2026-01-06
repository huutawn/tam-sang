package com.nht.identity.config;

import java.text.ParseException;
import java.util.Objects;

import org.springframework.context.annotation.Lazy;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import com.nht.identity.dto.request.IntrospectRequest;
import com.nht.identity.service.AuthenticationService;
import com.nimbusds.jose.JOSEException;

@Component
public class CustomJwtDecoder implements JwtDecoder {

    private final AuthenticationService authenticationService;
    private final RsaKeyProperties rsaKeyProperties;

    private NimbusJwtDecoder nimbusJwtDecoder = null;

    public CustomJwtDecoder(@Lazy AuthenticationService authenticationService, RsaKeyProperties rsaKeyProperties) {
        this.authenticationService = authenticationService;
        this.rsaKeyProperties = rsaKeyProperties;
    }

    @Override
    public Jwt decode(String token) throws JwtException {

        try {
            var response = authenticationService.introspect(new IntrospectRequest(token));

            if (!response.valid()) throw new JwtException("Token invalid");
        } catch (JOSEException | ParseException e) {
            throw new JwtException(e.getMessage());
        }

        if (Objects.isNull(nimbusJwtDecoder)) {
            nimbusJwtDecoder = NimbusJwtDecoder.withPublicKey(rsaKeyProperties.publicKey())
                    .signatureAlgorithm(SignatureAlgorithm.RS256)
                    .build();
        }

        return nimbusJwtDecoder.decode(token);
    }
}
