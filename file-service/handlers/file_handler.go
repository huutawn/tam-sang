package handlers

import (
	"fmt"
	"net/http"

	"file-service/models"
	"file-service/storage"
	"file-service/utils"

	"github.com/gin-gonic/gin"
)

type FileHandler struct {
	storage *storage.MinioStorage
}

// NewFileHandler creates a new file handler
func NewFileHandler(storage *storage.MinioStorage) *FileHandler {
	return &FileHandler{
		storage: storage,
	}
}

// UploadFile handles single file upload
// @Summary Upload a single file
// @Description Upload a single file to storage
// @Tags files
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "File to upload"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/files/upload [post]
func (h *FileHandler) UploadFile(c *gin.Context) {
	// Get file from request
	file, err := c.FormFile("file")
	if err != nil {
		utils.ValidationErrorResponse(c, "File is required")
		return
	}

	// Upload file
	metadata, err := h.storage.UploadFile(c.Request.Context(), file)
	if err != nil {
		if appErr, ok := err.(*models.AppError); ok {
			switch appErr.Code {
			case models.ErrCodeValidation, models.ErrCodeFileSize, models.ErrCodeFileType:
				utils.ValidationErrorResponse(c, appErr.Message)
			case models.ErrCodeStorage:
				utils.ServiceUnavailableResponse(c, "Storage")
			default:
				utils.InternalErrorResponse(c, err)
			}
			return
		}
		utils.InternalErrorResponse(c, err)
		return
	}

	utils.SuccessResponse(c, "File uploaded successfully", metadata)
}

// UploadMultipleFiles handles multiple files upload
// @Summary Upload multiple files
// @Description Upload multiple files to storage
// @Tags files
// @Accept multipart/form-data
// @Produce json
// @Param files formData file true "Files to upload" multiple
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/files/upload/batch [post]
func (h *FileHandler) UploadMultipleFiles(c *gin.Context) {
	// Get files from request
	form, err := c.MultipartForm()
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid multipart form")
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		utils.ValidationErrorResponse(c, "At least one file is required")
		return
	}

	// Upload files
	response, err := h.storage.UploadMultipleFiles(c.Request.Context(), files)
	if err != nil {
		utils.InternalErrorResponse(c, err)
		return
	}

	if response.Successful == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "All files failed to upload", nil)
		return
	}

	message := fmt.Sprintf("%d files uploaded successfully", response.Successful)
	if response.Failed > 0 {
		message = fmt.Sprintf("%d files uploaded successfully, %d failed", response.Successful, response.Failed)
	}

	utils.SuccessResponse(c, message, response)
}
