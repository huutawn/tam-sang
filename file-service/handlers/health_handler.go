package handlers

import (
	"context"
	"net/http"
	"time"

	"file-service/eureka"
	"file-service/models"
	"file-service/storage"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	storage *storage.MinioStorage
	eureka  *eureka.EurekaClient
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(storage *storage.MinioStorage, eureka *eureka.EurekaClient) *HealthHandler {
	return &HealthHandler{
		storage: storage,
		eureka:  eureka,
	}
}

// Health handles liveness probe
// @Summary Liveness probe
// @Description Check if service is alive
// @Tags health
// @Produce json
// @Success 200 {object} models.HealthResponse
// @Router /health [get]
func (h *HealthHandler) Health(c *gin.Context) {
	requestID := c.GetString("request_id")

	response := models.HealthResponse{
		Status:    "UP",
		Timestamp: time.Now(),
		RequestID: requestID,
	}

	c.JSON(http.StatusOK, response)
}

// Ready handles readiness probe
// @Summary Readiness probe
// @Description Check if service is ready to accept requests
// @Tags health
// @Produce json
// @Success 200 {object} models.HealthResponse
// @Failure 503 {object} models.HealthResponse
// @Router /health/ready [get]
func (h *HealthHandler) Ready(c *gin.Context) {
	requestID := c.GetString("request_id")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	checks := make(map[string]string)
	allHealthy := true

	// Check Minio
	if err := h.storage.HealthCheck(ctx); err != nil {
		checks["minio"] = "DOWN"
		allHealthy = false
	} else {
		checks["minio"] = "UP"
	}

	// Check Eureka
	if err := h.eureka.HealthCheck(); err != nil {
		checks["eureka"] = "DOWN"
		allHealthy = false
	} else {
		checks["eureka"] = "UP"
	}

	status := "UP"
	statusCode := http.StatusOK
	if !allHealthy {
		status = "DOWN"
		statusCode = http.StatusServiceUnavailable
	}

	response := models.HealthResponse{
		Status:    status,
		Checks:    checks,
		Timestamp: time.Now(),
		RequestID: requestID,
	}

	c.JSON(statusCode, response)
}
