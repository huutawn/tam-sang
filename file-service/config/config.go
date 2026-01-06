package config

import (
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Service  ServiceConfig
	Eureka   EurekaConfig
	Minio    MinioConfig
	Upload   UploadConfig
	Security SecurityConfig
	Logging  LoggingConfig
}

type ServiceConfig struct {
	Name    string
	Version string
	Port    string
	Host    string
	Env     string
}

type EurekaConfig struct {
	URL             string
	InstanceIP      string
	RenewalInterval int
	Duration        int
}

type MinioConfig struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
	Region    string
}

type UploadConfig struct {
	MaxFileSize      int64
	AllowedMimeTypes []string
	PresignedExpiry  time.Duration
}

type SecurityConfig struct {
	CORSAllowedOrigins []string
	RateLimitRequests  int
	RateLimitDuration  int
}

type LoggingConfig struct {
	Level  string
	Format string
}

func Load() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	// Set defaults
	setDefaults()

	if err := viper.ReadInConfig(); err != nil {
		// If .env file doesn't exist, use environment variables
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
	}

	config := &Config{
		Service: ServiceConfig{
			Name:    viper.GetString("SERVICE_NAME"),
			Version: viper.GetString("SERVICE_VERSION"),
			Port:    viper.GetString("SERVICE_PORT"),
			Host:    viper.GetString("SERVICE_HOST"),
			Env:     viper.GetString("ENV"),
		},
		Eureka: EurekaConfig{
			URL:             viper.GetString("EUREKA_URL"),
			InstanceIP:      viper.GetString("EUREKA_INSTANCE_IP"),
			RenewalInterval: viper.GetInt("EUREKA_RENEWAL_INTERVAL"),
			Duration:        viper.GetInt("EUREKA_DURATION"),
		},
		Minio: MinioConfig{
			Endpoint:  viper.GetString("MINIO_ENDPOINT"),
			AccessKey: viper.GetString("MINIO_ACCESS_KEY"),
			SecretKey: viper.GetString("MINIO_SECRET_KEY"),
			Bucket:    viper.GetString("MINIO_BUCKET"),
			UseSSL:    viper.GetBool("MINIO_USE_SSL"),
			Region:    viper.GetString("MINIO_REGION"),
		},
		Upload: UploadConfig{
			MaxFileSize:      viper.GetInt64("MAX_FILE_SIZE"),
			AllowedMimeTypes: parseStringSlice(viper.GetString("ALLOWED_MIME_TYPES")),
			PresignedExpiry:  time.Duration(viper.GetInt("PRESIGNED_URL_EXPIRY")) * time.Second,
		},
		Security: SecurityConfig{
			CORSAllowedOrigins: parseStringSlice(viper.GetString("CORS_ALLOWED_ORIGINS")),
			RateLimitRequests:  viper.GetInt("RATE_LIMIT_REQUESTS"),
			RateLimitDuration:  viper.GetInt("RATE_LIMIT_DURATION"),
		},
		Logging: LoggingConfig{
			Level:  viper.GetString("LOG_LEVEL"),
			Format: viper.GetString("LOG_FORMAT"),
		},
	}

	return config, nil
}

func setDefaults() {
	viper.SetDefault("ENV", "development")
	viper.SetDefault("SERVICE_NAME", "file-service")
	viper.SetDefault("SERVICE_VERSION", "1.0.0")
	viper.SetDefault("SERVICE_PORT", "8083")
	viper.SetDefault("SERVICE_HOST", "0.0.0.0")

	viper.SetDefault("EUREKA_URL", "http://localhost:8761/eureka")
	viper.SetDefault("EUREKA_INSTANCE_IP", "localhost")
	viper.SetDefault("EUREKA_RENEWAL_INTERVAL", 5)
	viper.SetDefault("EUREKA_DURATION", 10)

	viper.SetDefault("MINIO_ENDPOINT", "localhost:9000")
	viper.SetDefault("MINIO_ACCESS_KEY", "minioadmin")
	viper.SetDefault("MINIO_SECRET_KEY", "minioadmin")
	viper.SetDefault("MINIO_BUCKET", "file-service-bucket")
	viper.SetDefault("MINIO_USE_SSL", false)
	viper.SetDefault("MINIO_REGION", "us-east-1")

	viper.SetDefault("MAX_FILE_SIZE", 52428800) // 50MB
	viper.SetDefault("ALLOWED_MIME_TYPES", "image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain")
	viper.SetDefault("PRESIGNED_URL_EXPIRY", 3600)

	viper.SetDefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080")
	viper.SetDefault("RATE_LIMIT_REQUESTS", 100)
	viper.SetDefault("RATE_LIMIT_DURATION", 60)

	viper.SetDefault("LOG_LEVEL", "info")
	viper.SetDefault("LOG_FORMAT", "json")
}

func parseStringSlice(s string) []string {
	if s == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
