package com.nht.identity.utils;

import java.io.FileWriter;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;

/**
 * Generate RSA keys and save to file
 */
public class GenerateKeys {
    public static void main(String[] args) throws Exception {
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
        keyGen.initialize(2048);
        KeyPair pair = keyGen.generateKeyPair();

        String privateKey = Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded());
        String publicKey = Base64.getEncoder().encodeToString(pair.getPublic().getEncoded());

        try (FileWriter fw = new FileWriter("rsa-keys.txt")) {
            fw.write("PRIVATE KEY:\n");
            fw.write(formatKey(privateKey));
            fw.write("\n\nPUBLIC KEY:\n");
            fw.write(formatKey(publicKey));
        }

        System.out.println("Keys saved to rsa-keys.txt");
    }

    private static String formatKey(String key) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < key.length(); i += 64) {
            sb.append(key, i, Math.min(i + 64, key.length())).append("\n");
        }
        return sb.toString();
    }
}
