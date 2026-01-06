package models

import "time"

// APIResponse is the standard response wrapper
type APIResponse struct {
	Code      int         `json:"code"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	RequestID string      `json:"request_id"`
}

// FileMetadata contains file information
type FileMetadata struct {
	FileID      string    `json:"file_id"`
	URL         string    `json:"url"`
	Filename    string    `json:"filename"`
	Size        int64     `json:"size"`
	ContentType string    `json:"content_type"`
	Checksum    string    `json:"checksum"`
	UploadedAt  time.Time `json:"uploaded_at"`
}

// MultipleFilesResponse for batch upload
type MultipleFilesResponse struct {
	Files      []FileMetadata `json:"files"`
	Total      int            `json:"total"`
	Successful int            `json:"successful"`
	Failed     int            `json:"failed"`
}

// ErrorResponse contains error details
type ErrorResponse struct {
	Code      int       `json:"code"`
	Message   string    `json:"message"`
	Error     string    `json:"error,omitempty"`
	Timestamp time.Time `json:"timestamp"`
	RequestID string    `json:"request_id"`
}

// HealthResponse for health check endpoints
type HealthResponse struct {
	Status    string            `json:"status"`
	Checks    map[string]string `json:"checks,omitempty"`
	Timestamp time.Time         `json:"timestamp"`
	RequestID string            `json:"request_id,omitempty"`
}
