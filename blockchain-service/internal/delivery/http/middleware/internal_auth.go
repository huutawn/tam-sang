package middleware

import (
	"crypto/subtle"
	"net/http"

	"blockchain-service/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// InternalAuth validates requests from other internal services using a shared API key.
// Requests must include the header: X-Internal-API-Key: <key>
func InternalAuth(apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if apiKey == "" {
			// If no API key is configured, skip auth (development mode)
			logger.Warn("Internal API key not configured, skipping auth")
			c.Next()
			return
		}

		providedKey := c.GetHeader("X-Internal-API-Key")
		if providedKey == "" {
			logger.Warn("Missing X-Internal-API-Key header",
				zap.String("path", c.Request.URL.Path),
				zap.String("remote_addr", c.ClientIP()),
			)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Missing internal API key",
			})
			return
		}

		// Constant-time comparison to prevent timing attacks
		if subtle.ConstantTimeCompare([]byte(providedKey), []byte(apiKey)) != 1 {
			logger.Warn("Invalid X-Internal-API-Key",
				zap.String("path", c.Request.URL.Path),
				zap.String("remote_addr", c.ClientIP()),
			)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "Invalid internal API key",
			})
			return
		}

		c.Next()
	}
}
