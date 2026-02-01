package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	// RequestIDHeader is the header name for request ID
	RequestIDHeader = "X-Request-ID"
	// RequestIDKey is the context key for request ID
	RequestIDKey = "request_id"
)

// RequestID returns a middleware that generates or extracts request IDs
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to get request ID from header
		requestID := c.GetHeader(RequestIDHeader)

		// Generate new ID if not present
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Set in context
		c.Set(RequestIDKey, requestID)

		// Set in response header
		c.Header(RequestIDHeader, requestID)

		c.Next()
	}
}
