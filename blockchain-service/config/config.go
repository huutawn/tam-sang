package config

import (
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the service
type Config struct {
	Service  ServiceConfig
	Eureka   EurekaConfig
	Database DatabaseConfig
	Kafka    KafkaConfig
	Crypto   CryptoConfig
	Security SecurityConfig
	Logging  LoggingConfig
}

// ServiceConfig holds service-related configuration
type ServiceConfig struct {
	Name    string
	Version string
	Port    string
	Host    string
	Env     string
}

// EurekaConfig holds Eureka service discovery configuration
type EurekaConfig struct {
	URL             string
	InstanceIP      string
	RenewalInterval int
	Duration        int
}

// DatabaseConfig holds PostgreSQL configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// KafkaConfig holds Kafka messaging configuration
type KafkaConfig struct {
	Brokers                []string
	ConsumerGroup          string
	TopicTransactionEvents string
	TopicAuditResults      string
	TopicContractSign      string
	TopicDonationEvents    string
}

// CryptoConfig holds cryptographic keys configuration
type CryptoConfig struct {
	RSAPrivateKey    string
	RSAPublicKey     string
	AES256Key        string
	ECDSAPrivateKey  string
	ECDSAPublicKey   string
	SigningAlgorithm string // RSA or ECDSA
}

// SecurityConfig holds security-related configuration
type SecurityConfig struct {
	CORSAllowedOrigins []string
	RateLimitRequests  int
	RateLimitDuration  int
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level  string
	Format string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	// Set defaults
	setDefaults()

	if err := viper.ReadInConfig(); err != nil {
		// If .env file doesn't exist, use environment variables only
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
		Database: DatabaseConfig{
			Host:     viper.GetString("DB_HOST"),
			Port:     viper.GetString("DB_PORT"),
			User:     viper.GetString("DB_USER"),
			Password: viper.GetString("DB_PASSWORD"),
			DBName:   viper.GetString("DB_NAME"),
			SSLMode:  viper.GetString("DB_SSL_MODE"),
		},
		Kafka: KafkaConfig{
			Brokers:                parseStringSlice(viper.GetString("KAFKA_BROKERS")),
			ConsumerGroup:          viper.GetString("KAFKA_CONSUMER_GROUP"),
			TopicTransactionEvents: viper.GetString("KAFKA_TOPIC_TRANSACTION_EVENTS"),
			TopicAuditResults:      viper.GetString("KAFKA_TOPIC_AUDIT_RESULTS"),
			TopicContractSign:      viper.GetString("KAFKA_TOPIC_CONTRACT_SIGN"),
			TopicDonationEvents:    viper.GetString("KAFKA_TOPIC_DONATION_EVENTS"),
		},
		Crypto: CryptoConfig{
			RSAPrivateKey:    viper.GetString("RSA_PRIVATE_KEY"),
			RSAPublicKey:     viper.GetString("RSA_PUBLIC_KEY"),
			AES256Key:        viper.GetString("AES_256_KEY"),
			ECDSAPrivateKey:  viper.GetString("ECDSA_PRIVATE_KEY"),
			ECDSAPublicKey:   viper.GetString("ECDSA_PUBLIC_KEY"),
			SigningAlgorithm: viper.GetString("SIGNING_ALGORITHM"),
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

// setDefaults sets default values for configuration
func setDefaults() {
	// Service defaults
	viper.SetDefault("ENV", "development")
	viper.SetDefault("SERVICE_NAME", "blockchain-service")
	viper.SetDefault("SERVICE_VERSION", "1.0.0")
	viper.SetDefault("SERVICE_PORT", "8085")
	viper.SetDefault("SERVICE_HOST", "0.0.0.0")

	// Eureka defaults
	viper.SetDefault("EUREKA_URL", "http://localhost:8761/eureka")
	viper.SetDefault("EUREKA_INSTANCE_IP", "localhost")
	viper.SetDefault("EUREKA_RENEWAL_INTERVAL", 5)
	viper.SetDefault("EUREKA_DURATION", 10)

	// Database defaults
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("DB_USER", "postgres")
	viper.SetDefault("DB_PASSWORD", "tamsangpswd")
	viper.SetDefault("DB_NAME", "blockchain_db")
	viper.SetDefault("DB_SSL_MODE", "disable")

	// Kafka defaults
	viper.SetDefault("KAFKA_BROKERS", "localhost:9092")
	viper.SetDefault("KAFKA_CONSUMER_GROUP", "blockchain-service-group")
	viper.SetDefault("KAFKA_TOPIC_TRANSACTION_EVENTS", "transaction-events")
	viper.SetDefault("KAFKA_TOPIC_AUDIT_RESULTS", "audit-results")
	viper.SetDefault("KAFKA_TOPIC_CONTRACT_SIGN", "contract-sign-request")
	viper.SetDefault("KAFKA_TOPIC_DONATION_EVENTS", "donation-events")

	// Crypto defaults
	viper.SetDefault("SIGNING_ALGORITHM", "ECDSA")

	// Security defaults
	viper.SetDefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080")
	viper.SetDefault("RATE_LIMIT_REQUESTS", 100)
	viper.SetDefault("RATE_LIMIT_DURATION", 60)

	// Logging defaults
	viper.SetDefault("LOG_LEVEL", "info")
	viper.SetDefault("LOG_FORMAT", "json")
}

// parseStringSlice parses a comma-separated string into a slice
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

// GetDSN returns the PostgreSQL connection string
func (d *DatabaseConfig) GetDSN() string {
	return "host=" + d.Host +
		" user=" + d.User +
		" password=" + d.Password +
		" dbname=" + d.DBName +
		" port=" + d.Port +
		" sslmode=" + d.SSLMode +
		" TimeZone=Asia/Ho_Chi_Minh"
}

// Placeholder for duration parsing if needed
var _ = time.Second
