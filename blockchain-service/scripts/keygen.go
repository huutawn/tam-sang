package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"log"
)

func main() {
	// 1. RSA Keys (2048-bit)
	rsaPriv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		log.Fatal(err)
	}
	rsaPrivPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(rsaPriv),
	})
	rsaPubBytes, _ := x509.MarshalPKIXPublicKey(&rsaPriv.PublicKey)
	rsaPubPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: rsaPubBytes,
	})

	// 2. AES-256 Key (32 bytes)
	aesKey := make([]byte, 32)
	if _, err := rand.Read(aesKey); err != nil {
		log.Fatal(err)
	}

	// 3. ECDSA Keys (P-256)
	ecPriv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		log.Fatal(err)
	}
	ecPrivBytes, _ := x509.MarshalECPrivateKey(ecPriv)
	ecPrivPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "EC PRIVATE KEY",
		Bytes: ecPrivBytes,
	})
	ecPubBytes, _ := x509.MarshalPKIXPublicKey(&ecPriv.PublicKey)
	ecPubPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: ecPubBytes,
	})

	fmt.Println("--- RSA PRIV ---")
	fmt.Println(base64.StdEncoding.EncodeToString(rsaPrivPEM))
	fmt.Println("--- RSA PUB ---")
	fmt.Println(base64.StdEncoding.EncodeToString(rsaPubPEM))
	fmt.Println("--- AES 256 ---")
	fmt.Println(base64.StdEncoding.EncodeToString(aesKey))
	fmt.Println("--- ECDSA PRIV ---")
	fmt.Println(base64.StdEncoding.EncodeToString(ecPrivPEM))
	fmt.Println("--- ECDSA PUB ---")
	fmt.Println(base64.StdEncoding.EncodeToString(ecPubPEM))
}
