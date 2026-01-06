package middleware

import (
	"net/http"

	"file-service/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Recovery middleware recovers from panics and returns 500 error
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				requestID := c.GetString("request_id")

				// Log the panic
				logger.Error("Panic recovered",
					zap.String("request_id", requestID),
					zap.Any("error", err),
					zap.Stack("stack"),
				)

				// Return 500 error
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":       http.StatusInternalServerError,
					"message":    "Internal server error",
					"request_id": requestID,
				})

				c.Abort()
			}
		}()

		c.Next()
	}
}
