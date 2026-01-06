package models

import "fmt"

// ErrorCode represents application error codes
type ErrorCode int

const (
	ErrCodeValidation ErrorCode = iota + 1000
	ErrCodeFileSize
	ErrCodeFileType
	ErrCodeStorage
	ErrCodeServiceUnavailable
	ErrCodeInternal
)

// AppError represents an application error
type AppError struct {
	Code    ErrorCode
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// NewValidationError creates a validation error
func NewValidationError(message string) *AppError {
	return &AppError{
		Code:    ErrCodeValidation,
		Message: message,
	}
}

// NewFileSizeError creates a file size error
func NewFileSizeError(maxSize int64) *AppError {
	return &AppError{
		Code:    ErrCodeFileSize,
		Message: fmt.Sprintf("File size exceeds maximum allowed size of %d bytes", maxSize),
	}
}

// NewFileTypeError creates a file type error
func NewFileTypeError(contentType string) *AppError {
	return &AppError{
		Code:    ErrCodeFileType,
		Message: fmt.Sprintf("File type '%s' is not allowed", contentType),
	}
}

// NewStorageError creates a storage error
func NewStorageError(err error) *AppError {
	return &AppError{
		Code:    ErrCodeStorage,
		Message: "Storage operation failed",
		Err:     err,
	}
}

// NewServiceUnavailableError creates a service unavailable error
func NewServiceUnavailableError(service string) *AppError {
	return &AppError{
		Code:    ErrCodeServiceUnavailable,
		Message: fmt.Sprintf("Service '%s' is unavailable", service),
	}
}

// NewInternalError creates an internal error
func NewInternalError(err error) *AppError {
	return &AppError{
		Code:    ErrCodeInternal,
		Message: "Internal server error",
		Err:     err,
	}
}
