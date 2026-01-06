package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"file-service/config"
	"file-service/eureka"
	"file-service/handlers"
	"file-service/middleware"
	"file-service/pkg/logger"
	"file-service/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	if err := logger.Initialize(cfg.Logging.Level, cfg.Logging.Format); err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	logger.Info("Starting file-service",
		zap.String("version", cfg.Service.Version),
		zap.String("environment", cfg.Service.Env),
		zap.String("port", cfg.Service.Port),
	)

	// Initialize Minio storage
	minioStorage, err := storage.NewMinioStorage(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize Minio storage", zap.Error(err))
	}

	// Initialize Eureka client
	eurekaClient, err := eureka.NewEurekaClient(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize Eureka client", zap.Error(err))
	}

	// Register with Eureka
	if err := eurekaClient.Register(); err != nil {
		logger.Fatal("Failed to register with Eureka", zap.Error(err))
	}

	// Set Gin mode
	if cfg.Service.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create Gin router
	router := gin.New()

	// Configure CORS
	corsConfig := cors.Config{
		AllowOrigins:     cfg.Security.CORSAllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID"},
		ExposeHeaders:    []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	// Apply middleware
	router.Use(middleware.RequestID())
	router.Use(middleware.Logging())
	router.Use(middleware.Recovery())

	// Initialize handlers
	fileHandler := handlers.NewFileHandler(minioStorage)
	healthHandler := handlers.NewHealthHandler(minioStorage, eurekaClient)

	// Health check routes (no version prefix)
	router.GET("/health", healthHandler.Health)
	router.GET("/health/ready", healthHandler.Ready)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		files := v1.Group("/files")
		{
			files.POST("/upload", fileHandler.UploadFile)
			files.POST("/upload/batch", fileHandler.UploadMultipleFiles)
		}
	}

	// Create HTTP server
	addr := fmt.Sprintf("%s:%s", cfg.Service.Host, cfg.Service.Port)
	srv := &http.Server{
		Addr:           addr,
		Handler:        router,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// Start server in goroutine
	go func() {
		logger.Info("HTTP server started", zap.String("address", addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start HTTP server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Deregister from Eureka
	if err := eurekaClient.Deregister(); err != nil {
		logger.Error("Failed to deregister from Eureka", zap.Error(err))
	}

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
