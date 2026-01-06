package com.nht.identity.config;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

/**
 * Configuration properties for RSA keys used in JWT signing and verification.
 * Keys are parsed and loaded by RsaKeyConverter from the config server.
 */
public record RsaKeyProperties(
        RSAPrivateKey privateKey, RSAPublicKey publicKey, long validDuration, long refreshableDuration) {}
