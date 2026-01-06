package middleware

import (
	"time"

	"file-service/pkg/logger"
	"file-service/pkg/metrics"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Logging middleware logs all HTTP requests
func Logging() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method
		requestID := c.GetString("request_id")

		// Increment active requests
		metrics.ActiveRequests.Inc()
		defer metrics.ActiveRequests.Dec()

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(start)
		statusCode := c.Writer.Status()

		// Record metrics
		metrics.HTTPRequestDuration.WithLabelValues(
			method,
			path,
			string(rune(statusCode)),
		).Observe(duration.Seconds())

		// Log request
		logger.Info("HTTP request",
			zap.String("request_id", requestID),
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", statusCode),
			zap.Duration("duration", duration),
			zap.String("client_ip", c.ClientIP()),
		)
	}
}
