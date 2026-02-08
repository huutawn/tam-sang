package handler

import (
	"net/http"

	"blockchain-service/internal/domain"
	"blockchain-service/internal/usecase"
	"blockchain-service/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ContractHandler handles contract-related HTTP requests
type ContractHandler struct {
	contractSigner *usecase.ContractSigner
}

// NewContractHandler creates a new contract handler
func NewContractHandler(contractSigner *usecase.ContractSigner) *ContractHandler {
	return &ContractHandler{
		contractSigner: contractSigner,
	}
}

// SignContract handles POST /v1/contracts/sign
// @Summary Sign a new campaign contract
// @Description Generates a PDF contract, calculates SHA-256 hash, and signs it with RSA/ECDSA
// @Tags Contracts
// @Accept json
// @Produce json
// @Param request body domain.ContractCreateRequest true "Contract create request"
// @Success 200 {object} Response{result=domain.ContractSignResponse}
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/contracts/sign [post]
func (h *ContractHandler) SignContract(c *gin.Context) {
	var req domain.ContractCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid request body", zap.Error(err))
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request body: " + err.Error(),
		})
		return
	}

	// Validate required fields
	if req.CampaignID == "" || req.CampaignName == "" || req.OrganizerName == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "campaign_id, campaign_name, and organizer_name are required",
		})
		return
	}

	result, err := h.contractSigner.SignContract(c.Request.Context(), &req)
	if err != nil {
		logger.Error("Failed to sign contract", zap.Error(err))
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: "Failed to sign contract: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Contract signed successfully",
		Result:  result,
	})
}

// VerifyContract handles GET /v1/contracts/:contractId/verify
// @Summary Verify a contract's signature
// @Description Verifies the digital signature of a contract
// @Tags Contracts
// @Produce json
// @Param contractId path string true "Contract ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/contracts/{contractId}/verify [get]
func (h *ContractHandler) VerifyContract(c *gin.Context) {
	contractID := c.Param("contractId")
	if contractID == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "contractId is required",
		})
		return
	}

	isValid, err := h.contractSigner.VerifyContract(c.Request.Context(), contractID)
	if err != nil {
		logger.Error("Failed to verify contract", zap.Error(err))
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: "Failed to verify contract: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Contract verification completed",
		Result: map[string]interface{}{
			"contract_id": contractID,
			"is_valid":    isValid,
		},
	})
}

// GetContract handles GET /v1/contracts/:contractId
// @Summary Get a contract by ID
// @Description Retrieves a contract's metadata (without PDF content)
// @Tags Contracts
// @Produce json
// @Param contractId path string true "Contract ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 404 {object} Response
// @Failure 500 {object} Response
// @Router /v1/contracts/{contractId} [get]
func (h *ContractHandler) GetContract(c *gin.Context) {
	contractID := c.Param("contractId")
	if contractID == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "contractId is required",
		})
		return
	}

	contract, err := h.contractSigner.GetContract(c.Request.Context(), contractID)
	if err != nil {
		logger.Error("Failed to get contract", zap.Error(err))
		c.JSON(http.StatusNotFound, Response{
			Code:    404,
			Message: err.Error(),
		})
		return
	}

	// Return metadata without the PDF content (too large)
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Contract retrieved successfully",
		Result: map[string]interface{}{
			"id":             contract.ID.String(),
			"campaign_id":    contract.CampaignID,
			"campaign_name":  contract.CampaignName,
			"description":    contract.Description,
			"organizer_name": contract.OrganizerName,
			"organizer_id":   contract.OrganizerID,
			"target_amount":  contract.TargetAmount,
			"currency":       contract.Currency,
			"content_hash":   contract.ContentHash,
			"signature_alg":  contract.SignatureAlg,
			"public_key_id":  contract.PublicKeyID,
			"signed_at":      contract.SignedAt,
			"start_date":     contract.StartDate,
			"end_date":       contract.EndDate,
			"created_at":     contract.CreatedAt,
		},
	})
}

// GetContractByCampaign handles GET /v1/contracts/campaign/:campaignId
// @Summary Get a contract by campaign ID
// @Description Retrieves a contract for a specific campaign
// @Tags Contracts
// @Produce json
// @Param campaignId path string true "Campaign ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 404 {object} Response
// @Router /v1/contracts/campaign/{campaignId} [get]
func (h *ContractHandler) GetContractByCampaign(c *gin.Context) {
	campaignID := c.Param("campaignId")
	if campaignID == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "campaignId is required",
		})
		return
	}

	contract, err := h.contractSigner.GetContractByCampaign(c.Request.Context(), campaignID)
	if err != nil {
		logger.Error("Failed to get contract by campaign", zap.Error(err))
		c.JSON(http.StatusNotFound, Response{
			Code:    404,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Contract retrieved successfully",
		Result: map[string]interface{}{
			"id":            contract.ID.String(),
			"campaign_id":   contract.CampaignID,
			"campaign_name": contract.CampaignName,
			"content_hash":  contract.ContentHash,
			"signature_alg": contract.SignatureAlg,
			"signed_at":     contract.SignedAt,
		},
	})
}

// DownloadContract handles GET /v1/contracts/:contractId/download
// @Summary Download contract PDF
// @Description Downloads the signed PDF contract
// @Tags Contracts
// @Produce application/pdf
// @Param contractId path string true "Contract ID"
// @Success 200 {file} binary
// @Failure 400 {object} Response
// @Failure 404 {object} Response
// @Router /v1/contracts/{contractId}/download [get]
func (h *ContractHandler) DownloadContract(c *gin.Context) {
	contractID := c.Param("contractId")
	if contractID == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "contractId is required",
		})
		return
	}

	contract, err := h.contractSigner.GetContract(c.Request.Context(), contractID)
	if err != nil {
		logger.Error("Failed to get contract", zap.Error(err))
		c.JSON(http.StatusNotFound, Response{
			Code:    404,
			Message: err.Error(),
		})
		return
	}

	if len(contract.Content) == 0 {
		c.JSON(http.StatusNotFound, Response{
			Code:    404,
			Message: "Contract PDF not found",
		})
		return
	}

	filename := "contract_" + contract.CampaignID + ".pdf"
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Length", string(rune(len(contract.Content))))
	c.Data(http.StatusOK, "application/pdf", contract.Content)
}
