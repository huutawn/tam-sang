package crypto

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
)

// RSASigner handles RSA digital signatures
type RSASigner struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
}

// NewRSASigner creates a new RSA signer with the given private key
// privateKeyBase64 should be base64-encoded PEM private key
func NewRSASigner(privateKeyBase64 string) (*RSASigner, error) {
	if privateKeyBase64 == "" {
		return nil, errors.New("RSA private key cannot be empty")
	}

	// Decode base64
	keyPEM, err := base64.StdEncoding.DecodeString(privateKeyBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode private key base64: %w", err)
	}

	// Parse PEM block
	block, _ := pem.Decode(keyPEM)
	if block == nil {
		return nil, errors.New("failed to parse PEM block")
	}

	// Parse private key
	privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		// Try PKCS8 format
		key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %w", err)
		}
		var ok bool
		privateKey, ok = key.(*rsa.PrivateKey)
		if !ok {
			return nil, errors.New("key is not RSA private key")
		}
	}

	return &RSASigner{
		privateKey: privateKey,
		publicKey:  &privateKey.PublicKey,
	}, nil
}

// Sign signs the given data using RSA-SHA256 with PKCS1v15 padding
// Returns base64-encoded signature
func (r *RSASigner) Sign(data []byte) (string, error) {
	// Calculate SHA-256 hash of data
	hash := sha256.Sum256(data)

	// Sign the hash
	signature, err := rsa.SignPKCS1v15(rand.Reader, r.privateKey, crypto.SHA256, hash[:])
	if err != nil {
		return "", fmt.Errorf("failed to sign data: %w", err)
	}

	return base64.StdEncoding.EncodeToString(signature), nil
}

// SignPSS signs the given data using RSA-PSS (more secure padding)
// Returns base64-encoded signature
func (r *RSASigner) SignPSS(data []byte) (string, error) {
	hash := sha256.Sum256(data)

	opts := &rsa.PSSOptions{
		SaltLength: rsa.PSSSaltLengthEqualsHash,
		Hash:       crypto.SHA256,
	}

	signature, err := rsa.SignPSS(rand.Reader, r.privateKey, crypto.SHA256, hash[:], opts)
	if err != nil {
		return "", fmt.Errorf("failed to sign data with PSS: %w", err)
	}

	return base64.StdEncoding.EncodeToString(signature), nil
}

// Verify verifies the signature of the given data
func (r *RSASigner) Verify(data []byte, signatureBase64 string) error {
	signature, err := base64.StdEncoding.DecodeString(signatureBase64)
	if err != nil {
		return fmt.Errorf("failed to decode signature: %w", err)
	}

	hash := sha256.Sum256(data)

	err = rsa.VerifyPKCS1v15(r.publicKey, crypto.SHA256, hash[:], signature)
	if err != nil {
		return fmt.Errorf("signature verification failed: %w", err)
	}

	return nil
}

// VerifyPSS verifies a PSS signature
func (r *RSASigner) VerifyPSS(data []byte, signatureBase64 string) error {
	signature, err := base64.StdEncoding.DecodeString(signatureBase64)
	if err != nil {
		return fmt.Errorf("failed to decode signature: %w", err)
	}

	hash := sha256.Sum256(data)

	opts := &rsa.PSSOptions{
		SaltLength: rsa.PSSSaltLengthEqualsHash,
		Hash:       crypto.SHA256,
	}

	err = rsa.VerifyPSS(r.publicKey, crypto.SHA256, hash[:], signature, opts)
	if err != nil {
		return fmt.Errorf("PSS signature verification failed: %w", err)
	}

	return nil
}

// GetPublicKeyPEM returns the public key in PEM format
func (r *RSASigner) GetPublicKeyPEM() (string, error) {
	pubKeyBytes, err := x509.MarshalPKIXPublicKey(r.publicKey)
	if err != nil {
		return "", fmt.Errorf("failed to marshal public key: %w", err)
	}

	pemBlock := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	}

	return string(pem.EncodeToMemory(pemBlock)), nil
}

// GenerateRSAKeyPair generates a new RSA-2048 key pair
// Returns base64-encoded PEM private key and public key
func GenerateRSAKeyPair() (privateKeyBase64, publicKeyBase64 string, err error) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate RSA key pair: %w", err)
	}

	// Encode private key
	privateKeyBytes := x509.MarshalPKCS1PrivateKey(privateKey)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privateKeyBytes,
	})
	privateKeyBase64 = base64.StdEncoding.EncodeToString(privateKeyPEM)

	// Encode public key
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal public key: %w", err)
	}
	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	})
	publicKeyBase64 = base64.StdEncoding.EncodeToString(publicKeyPEM)

	return privateKeyBase64, publicKeyBase64, nil
}
