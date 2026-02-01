package http

import (
	"time"

	"blockchain-service/config"
	"blockchain-service/internal/delivery/http/handler"
	"blockchain-service/internal/delivery/http/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Router sets up the HTTP router
type Router struct {
	engine          *gin.Engine
	contractHandler *handler.ContractHandler
	auditHandler    *handler.AuditHandler
	walletHandler   *handler.WalletHandler
	healthHandler   *handler.HealthHandler
	config          *config.Config
}

// NewRouter creates a new HTTP router
func NewRouter(
	contractHandler *handler.ContractHandler,
	auditHandler *handler.AuditHandler,
	walletHandler *handler.WalletHandler,
	healthHandler *handler.HealthHandler,
	cfg *config.Config,
) *Router {
	return &Router{
		contractHandler: contractHandler,
		auditHandler:    auditHandler,
		walletHandler:   walletHandler,
		healthHandler:   healthHandler,
		config:          cfg,
	}
}

// Setup sets up the router and returns the gin engine
func (r *Router) Setup() *gin.Engine {
	// Set Gin mode
	if r.config.Service.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create engine
	engine := gin.New()

	// Configure CORS
	corsConfig := cors.Config{
		AllowOrigins:     r.config.Security.CORSAllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID"},
		ExposeHeaders:    []string{"X-Request-ID", "Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	engine.Use(cors.New(corsConfig))

	// Apply middleware
	engine.Use(middleware.RequestID())
	engine.Use(middleware.Logging())
	engine.Use(middleware.Recovery())

	// Health check routes (no version prefix)
	engine.GET("/health", r.healthHandler.Health)
	engine.GET("/health/ready", r.healthHandler.Ready)
	engine.GET("/health/live", r.healthHandler.Live)
	engine.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API v1 routes
	v1 := engine.Group("/v1")
	{
		// Contract routes
		contracts := v1.Group("/contracts")
		{
			contracts.POST("/sign", r.contractHandler.SignContract)
			contracts.GET("/:contractId", r.contractHandler.GetContract)
			contracts.GET("/:contractId/verify", r.contractHandler.VerifyContract)
			contracts.GET("/:contractId/download", r.contractHandler.DownloadContract)
			contracts.GET("/campaign/:campaignId", r.contractHandler.GetContractByCampaign)
		}

		// Wallet routes
		wallets := v1.Group("/wallets")
		{
			wallets.POST("", r.walletHandler.CreateWallet)
			wallets.GET("/:walletId", r.walletHandler.GetWallet)
			wallets.DELETE("/:walletId", r.walletHandler.DeleteWallet)
			wallets.POST("/:walletId/freeze", r.walletHandler.FreezeWallet)
			wallets.POST("/:walletId/unfreeze", r.walletHandler.UnfreezeWallet)
			wallets.GET("/campaign/:campaignId", r.walletHandler.GetWalletByCampaign)
			wallets.DELETE("/campaign/:campaignId", r.walletHandler.DeleteWalletByCampaign)
		}

		// Audit routes
		audit := v1.Group("/audit")
		{
			audit.GET("/verify/:walletId", r.auditHandler.VerifyWalletChain)
			audit.GET("/history/:walletId", r.auditHandler.GetTransactionHistory)
			audit.GET("/count/:walletId", r.auditHandler.GetBlockCount)
			audit.GET("/balance/:walletId", r.auditHandler.GetWalletBalance)             // Calculate balance from chain
			audit.GET("/verified-balance/:walletId", r.auditHandler.VerifyAndGetBalance) // Verify chain + calculate balance
		}
	}

	r.engine = engine
	return engine
}

// GetEngine returns the gin engine
func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}
