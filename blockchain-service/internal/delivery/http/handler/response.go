package handler

// Response represents a standard API response
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Result  interface{} `json:"result,omitempty"`
}

// PaginatedResponse represents a paginated API response
type PaginatedResponse struct {
	Code       int         `json:"code"`
	Message    string      `json:"message"`
	Result     interface{} `json:"result,omitempty"`
	Pagination *Pagination `json:"pagination,omitempty"`
}

// Pagination represents pagination metadata
type Pagination struct {
	Total  int64 `json:"total"`
	Offset int   `json:"offset"`
	Limit  int   `json:"limit"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// NewResponse creates a new success response
func NewResponse(message string, result interface{}) Response {
	return Response{
		Code:    0,
		Message: message,
		Result:  result,
	}
}

// NewErrorResponse creates a new error response
func NewErrorResponse(code int, message string) Response {
	return Response{
		Code:    code,
		Message: message,
	}
}

// NewPaginatedResponse creates a new paginated response
func NewPaginatedResponse(message string, result interface{}, total int64, offset, limit int) PaginatedResponse {
	return PaginatedResponse{
		Code:    0,
		Message: message,
		Result:  result,
		Pagination: &Pagination{
			Total:  total,
			Offset: offset,
			Limit:  limit,
		},
	}
}
