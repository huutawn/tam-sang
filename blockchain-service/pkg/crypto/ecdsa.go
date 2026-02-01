package crypto

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/asn1"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
)

// ECDSASigner handles ECDSA digital signatures using P-256 curve
type ECDSASigner struct {
	privateKey *ecdsa.PrivateKey
	publicKey  *ecdsa.PublicKey
}

// ecdsaSignature is the ASN.1 structure for ECDSA signatures
type ecdsaSignature struct {
	R, S *big.Int
}

// NewECDSASigner creates a new ECDSA signer with the given private key
// privateKeyBase64 should be base64-encoded PEM private key
func NewECDSASigner(privateKeyBase64 string) (*ECDSASigner, error) {
	if privateKeyBase64 == "" {
		return nil, errors.New("ECDSA private key cannot be empty")
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

	// Try EC PRIVATE KEY format (SEC 1)
	privateKey, err := x509.ParseECPrivateKey(block.Bytes)
	if err != nil {
		// Try PKCS8 format
		key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %w", err)
		}
		var ok bool
		privateKey, ok = key.(*ecdsa.PrivateKey)
		if !ok {
			return nil, errors.New("key is not ECDSA private key")
		}
	}

	return &ECDSASigner{
		privateKey: privateKey,
		publicKey:  &privateKey.PublicKey,
	}, nil
}

// Sign signs the given data using ECDSA with SHA-256
// Returns base64-encoded ASN.1 DER signature
func (e *ECDSASigner) Sign(data []byte) (string, error) {
	// Calculate SHA-256 hash of data
	hash := sha256.Sum256(data)

	// Sign the hash
	r, s, err := ecdsa.Sign(rand.Reader, e.privateKey, hash[:])
	if err != nil {
		return "", fmt.Errorf("failed to sign data: %w", err)
	}

	// Encode signature as ASN.1 DER
	signature, err := asn1.Marshal(ecdsaSignature{R: r, S: s})
	if err != nil {
		return "", fmt.Errorf("failed to marshal signature: %w", err)
	}

	return base64.StdEncoding.EncodeToString(signature), nil
}

// SignRaw signs data and returns raw r||s concatenated signature (64 bytes for P-256)
func (e *ECDSASigner) SignRaw(data []byte) (string, error) {
	hash := sha256.Sum256(data)

	r, s, err := ecdsa.Sign(rand.Reader, e.privateKey, hash[:])
	if err != nil {
		return "", fmt.Errorf("failed to sign data: %w", err)
	}

	// P-256 curve, each coordinate is 32 bytes
	signature := make([]byte, 64)
	rBytes := r.Bytes()
	sBytes := s.Bytes()

	// Pad to 32 bytes each
	copy(signature[32-len(rBytes):32], rBytes)
	copy(signature[64-len(sBytes):64], sBytes)

	return base64.StdEncoding.EncodeToString(signature), nil
}

// Verify verifies the ASN.1 DER encoded signature
func (e *ECDSASigner) Verify(data []byte, signatureBase64 string) error {
	signature, err := base64.StdEncoding.DecodeString(signatureBase64)
	if err != nil {
		return fmt.Errorf("failed to decode signature: %w", err)
	}

	// Parse ASN.1 signature
	var sig ecdsaSignature
	_, err = asn1.Unmarshal(signature, &sig)
	if err != nil {
		return fmt.Errorf("failed to parse signature: %w", err)
	}

	hash := sha256.Sum256(data)

	if !ecdsa.Verify(e.publicKey, hash[:], sig.R, sig.S) {
		return errors.New("signature verification failed")
	}

	return nil
}

// VerifyRaw verifies a raw r||s signature
func (e *ECDSASigner) VerifyRaw(data []byte, signatureBase64 string) error {
	signature, err := base64.StdEncoding.DecodeString(signatureBase64)
	if err != nil {
		return fmt.Errorf("failed to decode signature: %w", err)
	}

	if len(signature) != 64 {
		return fmt.Errorf("invalid signature length: expected 64, got %d", len(signature))
	}

	r := new(big.Int).SetBytes(signature[:32])
	s := new(big.Int).SetBytes(signature[32:])

	hash := sha256.Sum256(data)

	if !ecdsa.Verify(e.publicKey, hash[:], r, s) {
		return errors.New("signature verification failed")
	}

	return nil
}

// GetPublicKeyPEM returns the public key in PEM format
func (e *ECDSASigner) GetPublicKeyPEM() (string, error) {
	pubKeyBytes, err := x509.MarshalPKIXPublicKey(e.publicKey)
	if err != nil {
		return "", fmt.Errorf("failed to marshal public key: %w", err)
	}

	pemBlock := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	}

	return string(pem.EncodeToMemory(pemBlock)), nil
}

// GenerateECDSAKeyPair generates a new ECDSA P-256 key pair
// Returns base64-encoded PEM private key and public key
func GenerateECDSAKeyPair() (privateKeyBase64, publicKeyBase64 string, err error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate ECDSA key pair: %w", err)
	}

	// Encode private key
	privateKeyBytes, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal private key: %w", err)
	}
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "EC PRIVATE KEY",
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
