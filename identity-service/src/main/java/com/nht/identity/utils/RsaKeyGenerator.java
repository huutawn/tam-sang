package com.nht.identity.utils;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * Utility class to generate RSA key pair for JWT signing.
 * Run this once to generate private and public keys.
 */
public class RsaKeyGenerator {

    public static void main(String[] args) {
        try {
            // Generate RSA key pair with 2048-bit key size
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");
            keyPairGenerator.initialize(2048);
            KeyPair keyPair = keyPairGenerator.generateKeyPair();

            // Encode keys to Base64
            String privateKey =
                    Base64.getEncoder().encodeToString(keyPair.getPrivate().getEncoded());
            String publicKey =
                    Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded());

            // Print private key in PEM format
            System.out.println("=== PRIVATE KEY (Add to application.yaml) ===");
            System.out.println("jwt:");
            System.out.println("  private-key: |");
            System.out.println("    -----BEGIN PRIVATE KEY-----");
            printFormattedKey(privateKey);
            System.out.println("    -----END PRIVATE KEY-----");
            System.out.println();

            // Print public key in PEM format
            System.out.println("=== PUBLIC KEY (Add to application.yaml) ===");
            System.out.println("  public-key: |");
            System.out.println("    -----BEGIN PUBLIC KEY-----");
            printFormattedKey(publicKey);
            System.out.println("    -----END PUBLIC KEY-----");
            System.out.println();

            System.out.println("✅ RSA key pair generated successfully!");
            System.out.println("📋 Copy the above keys to your application.yaml file");

        } catch (NoSuchAlgorithmException e) {
            System.err.println("❌ Error generating RSA keys: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Format Base64 key into 64-character lines (PEM standard)
     */
    private static void printFormattedKey(String key) {
        int lineLength = 64;
        for (int i = 0; i < key.length(); i += lineLength) {
            int endIndex = Math.min(i + lineLength, key.length());
            System.out.println("    " + key.substring(i, endIndex));
        }
    }
}
