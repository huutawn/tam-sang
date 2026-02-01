package handler

import (
	"net/http"

	"blockchain-service/pkg/database"
	"blockchain-service/pkg/eureka"

	"github.com/gin-gonic/gin"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	db           *database.Database
	eurekaClient *eureka.Client
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(db *database.Database, eurekaClient *eureka.Client) *HealthHandler {
	return &HealthHandler{
		db:           db,
		eurekaClient: eurekaClient,
	}
}

// Health handles GET /health
// @Summary Basic health check
// @Description Returns service health status
// @Tags Health
// @Produce json
// @Success 200 {object} Response
// @Router /health [get]
func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "OK",
		Result: map[string]string{
			"status":  "UP",
			"service": "blockchain-service",
		},
	})
}

// Ready handles GET /health/ready
// @Summary Readiness check
// @Description Checks if the service is ready to handle requests
// @Tags Health
// @Produce json
// @Success 200 {object} Response
// @Failure 503 {object} Response
// @Router /health/ready [get]
func (h *HealthHandler) Ready(c *gin.Context) {
	checks := make(map[string]string)
	allHealthy := true

	// Check database
	if h.db != nil {
		if err := h.db.HealthCheck(); err != nil {
			checks["database"] = "DOWN: " + err.Error()
			allHealthy = false
		} else {
			checks["database"] = "UP"
		}
	}

	// Check Eureka
	if h.eurekaClient != nil {
		if err := h.eurekaClient.HealthCheck(); err != nil {
			checks["eureka"] = "DOWN: " + err.Error()
			// Don't fail readiness for Eureka issues
		} else {
			checks["eureka"] = "UP"
		}
	}

	status := "UP"
	httpStatus := http.StatusOK
	if !allHealthy {
		status = "DOWN"
		httpStatus = http.StatusServiceUnavailable
	}

	c.JSON(httpStatus, Response{
		Code:    0,
		Message: status,
		Result: map[string]interface{}{
			"status": status,
			"checks": checks,
		},
	})
}

// Live handles GET /health/live
// @Summary Liveness check
// @Description Checks if the service is alive
// @Tags Health
// @Produce json
// @Success 200 {object} Response
// @Router /health/live [get]
func (h *HealthHandler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "OK",
		Result: map[string]string{
			"status": "UP",
		},
	})
}
