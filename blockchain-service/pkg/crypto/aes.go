package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

// AESEncryptor handles AES-256-GCM encryption and decryption
type AESEncryptor struct {
	key []byte
}

// NewAESEncryptor creates a new AES encryptor with the given key
// Key must be 32 bytes (256 bits) for AES-256
func NewAESEncryptor(keyBase64 string) (*AESEncryptor, error) {
	if keyBase64 == "" {
		return nil, errors.New("AES key cannot be empty")
	}

	key, err := base64.StdEncoding.DecodeString(keyBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode AES key: %w", err)
	}

	if len(key) != 32 {
		return nil, fmt.Errorf("AES key must be 32 bytes, got %d bytes", len(key))
	}

	return &AESEncryptor{key: key}, nil
}

// Encrypt encrypts plaintext using AES-256-GCM
// Returns base64-encoded ciphertext (nonce + encrypted data + auth tag)
func (a *AESEncryptor) Encrypt(plaintext []byte) (string, error) {
	block, err := aes.NewCipher(a.key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	// Generate random nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt and append nonce at the beginning
	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)

	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts base64-encoded ciphertext using AES-256-GCM
func (a *AESEncryptor) Decrypt(ciphertextBase64 string) ([]byte, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	block, err := aes.NewCipher(a.key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	// Extract nonce and encrypted data
	nonce, encryptedData := ciphertext[:nonceSize], ciphertext[nonceSize:]

	// Decrypt
	plaintext, err := gcm.Open(nil, nonce, encryptedData, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	return plaintext, nil
}

// EncryptString encrypts a string and returns base64-encoded ciphertext
func (a *AESEncryptor) EncryptString(plaintext string) (string, error) {
	return a.Encrypt([]byte(plaintext))
}

// DecryptString decrypts base64-encoded ciphertext and returns a string
func (a *AESEncryptor) DecryptString(ciphertextBase64 string) (string, error) {
	plaintext, err := a.Decrypt(ciphertextBase64)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

// GenerateKey generates a random 256-bit AES key and returns it base64-encoded
func GenerateAESKey() (string, error) {
	key := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return "", fmt.Errorf("failed to generate key: %w", err)
	}
	return base64.StdEncoding.EncodeToString(key), nil
}
