package storage

import (
	"context"
	"fmt"
	"mime/multipart"
	"time"

	"file-service/config"
	"file-service/models"
	"file-service/pkg/logger"
	"file-service/pkg/metrics"
	"file-service/utils"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

type MinioStorage struct {
	client *minio.Client
	config *config.MinioConfig
	upload *config.UploadConfig
}

// NewMinioStorage creates a new Minio storage client
func NewMinioStorage(cfg *config.Config) (*MinioStorage, error) {
	// Initialize Minio client
	client, err := minio.New(cfg.Minio.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.Minio.AccessKey, cfg.Minio.SecretKey, ""),
		Secure: cfg.Minio.UseSSL,
		Region: cfg.Minio.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create minio client: %w", err)
	}

	storage := &MinioStorage{
		client: client,
		config: &cfg.Minio,
		upload: &cfg.Upload,
	}

	// Ensure bucket exists
	if err := storage.ensureBucket(context.Background()); err != nil {
		return nil, err
	}

	// Update health metric
	metrics.MinioConnectionStatus.Set(1)
	logger.Info("Minio storage initialized", zap.String("bucket", cfg.Minio.Bucket))

	return storage, nil
}

// ensureBucket creates bucket if it doesn't exist
func (s *MinioStorage) ensureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.config.Bucket)
	if err != nil {
		metrics.MinioConnectionStatus.Set(0)
		return fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		err = s.client.MakeBucket(ctx, s.config.Bucket, minio.MakeBucketOptions{
			Region: s.config.Region,
		})
		if err != nil {
			metrics.MinioConnectionStatus.Set(0)
			return fmt.Errorf("failed to create bucket: %w", err)
		}
		logger.Info("Created new bucket", zap.String("bucket", s.config.Bucket))
	}

	return nil
}

// UploadFile uploads a single file to Minio
func (s *MinioStorage) UploadFile(ctx context.Context, file *multipart.FileHeader) (*models.FileMetadata, error) {
	// Open the file
	src, err := file.Open()
	if err != nil {
		return nil, models.NewInternalError(err)
	}
	defer src.Close()

	// Validate file size
	if err := utils.ValidateFileSize(file.Size, s.upload.MaxFileSize); err != nil {
		return nil, err
	}

	// Detect content type
	contentType, err := utils.DetectContentType(src)
	if err != nil {
		return nil, models.NewInternalError(err)
	}

	// Validate file type
	if err := utils.ValidateFileType(contentType, s.upload.AllowedMimeTypes); err != nil {
		return nil, err
	}

	// Calculate MD5 checksum
	checksum, err := utils.CalculateMD5(src)
	if err != nil {
		return nil, models.NewInternalError(err)
	}

	// Sanitize filename
	sanitizedFilename := utils.SanitizeFilename(file.Filename)

	// Generate unique file ID
	fileID := uuid.New().String()

	// Create object name with date-based path: YYYY/MM/DD/uuid_filename
	now := time.Now()
	objectName := fmt.Sprintf("%d/%02d/%02d/%s_%s",
		now.Year(), now.Month(), now.Day(),
		fileID, sanitizedFilename)

	// Upload to Minio
	_, err = s.client.PutObject(ctx, s.config.Bucket, objectName, src, file.Size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		metrics.FileUploadTotal.WithLabelValues("failure").Inc()
		return nil, models.NewStorageError(err)
	}

	// Record metrics
	metrics.FileUploadTotal.WithLabelValues("success").Inc()
	metrics.FileUploadSize.WithLabelValues(contentType).Observe(float64(file.Size))

	// Generate URL
	url := s.generateURL(objectName)

	metadata := &models.FileMetadata{
		FileID:      fileID,
		URL:         url,
		Filename:    sanitizedFilename,
		Size:        file.Size,
		ContentType: contentType,
		Checksum:    checksum,
		UploadedAt:  now,
	}

	logger.Info("File uploaded successfully",
		zap.String("file_id", fileID),
		zap.String("filename", sanitizedFilename),
		zap.Int64("size", file.Size),
		zap.String("content_type", contentType),
	)

	return metadata, nil
}

// UploadMultipleFiles uploads multiple files
func (s *MinioStorage) UploadMultipleFiles(ctx context.Context, files []*multipart.FileHeader) (*models.MultipleFilesResponse, error) {
	response := &models.MultipleFilesResponse{
		Files:      make([]models.FileMetadata, 0, len(files)),
		Total:      len(files),
		Successful: 0,
		Failed:     0,
	}

	for _, file := range files {
		metadata, err := s.UploadFile(ctx, file)
		if err != nil {
			response.Failed++
			logger.Warn("Failed to upload file",
				zap.String("filename", file.Filename),
				zap.Error(err),
			)
			continue
		}

		response.Files = append(response.Files, *metadata)
		response.Successful++
	}

	return response, nil
}

// generateURL generates the accessible URL for a file
func (s *MinioStorage) generateURL(objectName string) string {
	protocol := "http"
	if s.config.UseSSL {
		protocol = "https"
	}
	return fmt.Sprintf("%s://%s/%s/%s", protocol, s.config.Endpoint, s.config.Bucket, objectName)
}

// GetPresignedURL generates a presigned URL for file download
func (s *MinioStorage) GetPresignedURL(ctx context.Context, objectName string) (string, error) {
	url, err := s.client.PresignedGetObject(ctx, s.config.Bucket, objectName, s.upload.PresignedExpiry, nil)
	if err != nil {
		return "", models.NewStorageError(err)
	}
	return url.String(), nil
}

// DeleteFile deletes a file from storage
func (s *MinioStorage) DeleteFile(ctx context.Context, objectName string) error {
	err := s.client.RemoveObject(ctx, s.config.Bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return models.NewStorageError(err)
	}

	logger.Info("File deleted successfully", zap.String("object_name", objectName))
	return nil
}

// HealthCheck checks if Minio is accessible
func (s *MinioStorage) HealthCheck(ctx context.Context) error {
	_, err := s.client.BucketExists(ctx, s.config.Bucket)
	if err != nil {
		metrics.MinioConnectionStatus.Set(0)
		return err
	}
	metrics.MinioConnectionStatus.Set(1)
	return nil
}
