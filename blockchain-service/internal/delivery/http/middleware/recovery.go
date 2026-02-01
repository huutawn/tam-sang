package middleware

import (
	"net/http"
	"runtime/debug"

	"blockchain-service/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Recovery returns a middleware that recovers from panics
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Get stack trace
				stack := debug.Stack()

				// Get request ID
				requestID := c.GetString("request_id")

				// Log the panic
				logger.Error("Panic recovered",
					zap.String("request_id", requestID),
					zap.Any("error", err),
					zap.String("stack", string(stack)),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
				)

				// Return 500 error
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "Internal server error",
				})
			}
		}()

		c.Next()
	}
}
