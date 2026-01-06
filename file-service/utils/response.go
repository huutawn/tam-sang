package utils

import (
	"net/http"
	"time"

	"file-service/models"

	"github.com/gin-gonic/gin"
)

// SuccessResponse sends a success response
func SuccessResponse(c *gin.Context, message string, data interface{}) {
	requestID := c.GetString("request_id")

	response := models.APIResponse{
		Code:      http.StatusOK,
		Message:   message,
		Data:      data,
		Timestamp: time.Now(),
		RequestID: requestID,
	}

	c.JSON(http.StatusOK, response)
}

// ErrorResponse sends an error response
func ErrorResponse(c *gin.Context, statusCode int, message string, err error) {
	requestID := c.GetString("request_id")

	response := models.ErrorResponse{
		Code:      statusCode,
		Message:   message,
		Timestamp: time.Now(),
		RequestID: requestID,
	}

	if err != nil {
		response.Error = err.Error()
	}

	c.JSON(statusCode, response)
}

// ValidationErrorResponse sends a validation error response
func ValidationErrorResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusBadRequest, message, nil)
}

// InternalErrorResponse sends an internal server error response
func InternalErrorResponse(c *gin.Context, err error) {
	ErrorResponse(c, http.StatusInternalServerError, "Internal server error", err)
}

// ServiceUnavailableResponse sends a service unavailable response
func ServiceUnavailableResponse(c *gin.Context, service string) {
	ErrorResponse(c, http.StatusServiceUnavailable, service+" is unavailable", nil)
}
