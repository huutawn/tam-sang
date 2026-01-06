package utils

import (
	"crypto/md5"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"

	"file-service/models"
)

var (
	// Regex to detect path traversal attempts
	pathTraversalRegex = regexp.MustCompile(`\.\.`)
	// Regex for safe filenames
	safeFilenameRegex = regexp.MustCompile(`^[a-zA-Z0-9._-]+$`)
)

// ValidateFileSize checks if file size is within limits
func ValidateFileSize(size int64, maxSize int64) error {
	if size > maxSize {
		return models.NewFileSizeError(maxSize)
	}
	if size == 0 {
		return models.NewValidationError("File is empty")
	}
	return nil
}

// ValidateFileType checks if file type is allowed
func ValidateFileType(contentType string, allowedTypes []string) error {
	if len(allowedTypes) == 0 {
		return nil // No restrictions
	}

	for _, allowed := range allowedTypes {
		if contentType == allowed {
			return nil
		}
	}

	return models.NewFileTypeError(contentType)
}

// SanitizeFilename removes dangerous characters from filename
func SanitizeFilename(filename string) string {
	// Remove path separators
	filename = filepath.Base(filename)

	// Check for path traversal
	if pathTraversalRegex.MatchString(filename) {
		filename = strings.ReplaceAll(filename, "..", "")
	}

	// Remove any null bytes
	filename = strings.ReplaceAll(filename, "\x00", "")

	// If filename is now empty or unsafe, generate a safe one
	if filename == "" || filename == "." || filename == ".." {
		filename = "unnamed_file"
	}

	return filename
}

// DetectContentType detects the MIME type of a file
func DetectContentType(file multipart.File) (string, error) {
	// Read first 512 bytes for content type detection
	buffer := make([]byte, 512)
	_, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}

	// Reset file pointer
	_, err = file.Seek(0, 0)
	if err != nil {
		return "", err
	}

	contentType := http.DetectContentType(buffer)
	return contentType, nil
}

// CalculateMD5 calculates MD5 checksum of a file
func CalculateMD5(file multipart.File) (string, error) {
	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	// Reset file pointer
	_, err := file.Seek(0, 0)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}
