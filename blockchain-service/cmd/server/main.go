package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"blockchain-service/config"
	httpRouter "blockchain-service/internal/delivery/http"
	"blockchain-service/internal/delivery/http/handler"
	kafkaHandler "blockchain-service/internal/delivery/kafka"
	"blockchain-service/internal/domain"
	"blockchain-service/internal/repository"
	"blockchain-service/internal/usecase"
	"blockchain-service/pkg/cronjob"
	"blockchain-service/pkg/database"
	"blockchain-service/pkg/eureka"
	"blockchain-service/pkg/httpclient"
	"blockchain-service/pkg/kafka"
	"blockchain-service/pkg/logger"

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

	logger.Info("Starting blockchain-service",
		zap.String("version", cfg.Service.Version),
		zap.String("environment", cfg.Service.Env),
		zap.String("port", cfg.Service.Port),
	)

	// Initialize database
	db, err := database.NewDatabase(&cfg.Database)
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}
	defer func() {
		if err := db.Close(); err != nil {
			logger.Error("Failed to close database", zap.Error(err))
		}
	}()

	// Run migrations
	if err := db.AutoMigrate(
		&domain.Contract{},
		&domain.TransactionHash{},
		&domain.Wallet{},
	); err != nil {
		logger.Fatal("Failed to run migrations", zap.Error(err))
	}

	// Initialize Eureka client
	eurekaClient, err := eureka.NewClient(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize Eureka client", zap.Error(err))
	}

	// Register with Eureka
	if err := eurekaClient.Register(); err != nil {
		logger.Fatal("Failed to register with Eureka", zap.Error(err))
	}

	// Initialize Kafka producer for audit results
	var auditProducer *kafka.Producer
	if len(cfg.Kafka.Brokers) > 0 && cfg.Kafka.Brokers[0] != "" {
		auditProducer = kafka.NewProducer(&cfg.Kafka, cfg.Kafka.TopicAuditResults)
	}

	// Initialize repositories
	contractRepo := repository.NewContractRepository(db.DB)
	txHashRepo := repository.NewTransactionHashRepository(db.DB)
	walletRepo := repository.NewWalletRepository(db.DB)

	// Initialize usecases
	contractSigner, err := usecase.NewContractSigner(contractRepo, &cfg.Crypto)
	if err != nil {
		logger.Warn("Failed to initialize contract signer (keys may be missing)", zap.Error(err))
		contractSigner, _ = usecase.NewContractSigner(contractRepo, &cfg.Crypto)
	}

	// LedgerAuditor now requires walletRepo and db for atomic balance updates
	ledgerAuditor := usecase.NewLedgerAuditor(txHashRepo, walletRepo, auditProducer, db)

	walletGuard, err := usecase.NewWalletGuard(walletRepo, &cfg.Crypto)
	if err != nil {
		logger.Warn("Failed to initialize wallet guard (AES key may be missing)", zap.Error(err))
		walletGuard, _ = usecase.NewWalletGuard(walletRepo, &cfg.Crypto)
	}

	// Initialize handlers
	contractHandler := handler.NewContractHandler(contractSigner)
	auditHandler := handler.NewAuditHandler(ledgerAuditor)
	walletHandler := handler.NewWalletHandler(walletGuard)
	healthHandler := handler.NewHealthHandler(db, eurekaClient)

	// Initialize router
	router := httpRouter.NewRouter(contractHandler, auditHandler, walletHandler, healthHandler, cfg)
	engine := router.Setup()

	// Initialize Kafka consumer for transaction events
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if len(cfg.Kafka.Brokers) > 0 && cfg.Kafka.Brokers[0] != "" {
		txConsumer := kafka.NewConsumer(&cfg.Kafka, cfg.Kafka.TopicTransactionEvents)

		// Register handler for transaction events
		txConsumer.RegisterHandler("transaction-created", func(ctx context.Context, eventType string, payload []byte) error {
			var event domain.TransactionEvent
			if err := json.Unmarshal(payload, &event); err != nil {
				logger.Error("Failed to parse transaction event", zap.Error(err))
				return err
			}

			logger.Info("Received transaction event",
				zap.String("transaction_id", event.TransactionID),
				zap.String("wallet_id", event.WalletID),
				zap.String("type", event.Type),
				zap.Float64("amount", event.Amount),
			)

			// Add transaction to hash-chain and update wallet balance atomically
			return ledgerAuditor.AddTransaction(ctx, &event)
		})

		// Register default handler
		txConsumer.RegisterHandler("*", func(ctx context.Context, eventType string, payload []byte) error {
			logger.Debug("Received unhandled event", zap.String("event_type", eventType))
			return nil
		})

		// Start consumer
		txConsumer.Start(ctx)
		defer txConsumer.Stop()

		// Initialize contract sign consumer if topic is configured
		if cfg.Kafka.TopicContractSign != "" {
			contractConsumer := kafka.NewConsumer(&cfg.Kafka, cfg.Kafka.TopicContractSign)

			// Register handler for contract-sign-request events
			contractConsumer.RegisterHandler("contract-sign-request", func(ctx context.Context, eventType string, payload []byte) error {
				var signRequest domain.ContractSignKafkaRequest
				if err := json.Unmarshal(payload, &signRequest); err != nil {
					logger.Error("Failed to parse contract sign request", zap.Error(err))
					return err
				}

				logger.Info("Received contract sign request",
					zap.String("campaign_id", signRequest.CampaignID),
					zap.String("organizer_name", signRequest.OrganizerName),
				)

				// Sign the contract
				contractReq := signRequest.ToContractCreateRequest()
				contract, err := contractSigner.SignContract(ctx, contractReq)
				if err != nil {
					logger.Error("Failed to sign contract",
						zap.String("campaign_id", signRequest.CampaignID),
						zap.Error(err),
					)
					return err
				}

				logger.Info("Contract signed successfully",
					zap.String("contract_id", contract.ContractID),
					zap.String("campaign_id", signRequest.CampaignID),
				)

				return nil
			})

			// Register default handler
			contractConsumer.RegisterHandler("*", func(ctx context.Context, eventType string, payload []byte) error {
				logger.Debug("Received unhandled contract event", zap.String("event_type", eventType))
				return nil
			})

			// Start contract consumer
			contractConsumer.Start(ctx)
			defer contractConsumer.Stop()
		}

		// Initialize donation consumer if topic is configured
		if cfg.Kafka.TopicDonationEvents != "" {
			// Create HTTP client to call back core-service
			coreServiceClient := httpclient.NewCoreServiceClient(cfg.Eureka.URL)

			// Create donation handler
			donationHandler := kafkaHandler.NewDonationHandler(ledgerAuditor, coreServiceClient)

			// Create donation consumer
			donationConsumer := kafka.NewConsumer(&cfg.Kafka, cfg.Kafka.TopicDonationEvents)

			// Register handler for donation events
			donationConsumer.RegisterHandler("*", donationHandler.HandleDonationEvent)

			// Start donation consumer
			donationConsumer.Start(ctx)
			defer donationConsumer.Stop()

			logger.Info("Donation consumer started",
				zap.String("topic", cfg.Kafka.TopicDonationEvents),
			)
		}
	}

	// Initialize and start wallet verification cronjob (every 2 hours)
	walletVerifier := cronjob.NewWalletVerifier(walletRepo, txHashRepo, auditProducer, 2)
	walletVerifier.Start(ctx)
	defer walletVerifier.Stop()

	// Create HTTP server
	addr := fmt.Sprintf("%s:%s", cfg.Service.Host, cfg.Service.Port)
	srv := &http.Server{
		Addr:           addr,
		Handler:        engine,
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

	// Cancel context to stop Kafka consumer and cronjob
	cancel()

	// Close Kafka producer
	if auditProducer != nil {
		if err := auditProducer.Close(); err != nil {
			logger.Error("Failed to close Kafka producer", zap.Error(err))
		}
	}

	// Deregister from Eureka
	if err := eurekaClient.Deregister(); err != nil {
		logger.Error("Failed to deregister from Eureka", zap.Error(err))
	}

	// Graceful shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
	}

	// Placeholders to avoid unused variable warnings
	_ = walletGuard

	logger.Info("Server exited")
}
