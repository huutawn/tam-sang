package handler

import (
	"net/http"

	"blockchain-service/internal/domain"
	"blockchain-service/internal/usecase"
	"blockchain-service/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// WalletHandler handles wallet-related HTTP requests
type WalletHandler struct {
	walletGuard *usecase.WalletGuard
}

// NewWalletHandler creates a new wallet handler
func NewWalletHandler(walletGuard *usecase.WalletGuard) *WalletHandler {
	return &WalletHandler{
		walletGuard: walletGuard,
	}
}

// CreateWallet handles POST /v1/wallets
// @Summary Create a new wallet for a campaign
// @Description Creates a new wallet with auto-generated keys for a campaign
// @Tags Wallets
// @Accept json
// @Produce json
// @Param request body domain.WalletCreateRequest true "Wallet create request"
// @Success 200 {object} Response{result=domain.WalletResponse}
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/wallets [post]
func (h *WalletHandler) CreateWallet(c *gin.Context) {
	var req domain.WalletCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid request body", zap.Error(err))
		c.JSON(http.StatusOK, Response{
			Code:    400,
			Message: "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.CampaignID == "" {
		c.JSON(http.StatusOK, Response{
			Code:    400,
			Message: "campaign_id is required",
		})
		return
	}

	result, err := h.walletGuard.CreateWallet(c.Request.Context(), &req)
	if err != nil {
		logger.Error("Failed to create wallet", zap.Error(err))
		c.JSON(http.StatusOK, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Wallet created successfully",
		Result:  result,
	})
}

// GetWallet handles GET /v1/wallets/:walletId
// @Summary Get wallet by ID
// @Description Retrieves wallet information by ID
// @Tags Wallets
// @Produce json
// @Param walletId path string true "Wallet ID"
// @Success 200 {object} Response{result=domain.WalletResponse}
// @Failure 400 {object} Response
// @Failure 404 {object} Response
// @Router /v1/wallets/{walletId} [get]
func (h *WalletHandler) GetWallet(c *gin.Context) {
	walletID := c.Param("walletId")
	if walletID == "" {
		c.JSON(http.StatusOK, Response{
			Code:    400,
			Message: "walletId is required",
		})
		return
	}

	result, err := h.walletGuard.GetWallet(c.Request.Context(), walletID)
	if err != nil {
		logger.Error("Failed to get wallet", zap.Error(err))
		c.JSON(http.StatusOK, Response{
			Code:    404,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Wallet retrieved successfully",
		Result:  result,
	})
}

// GetWalletByCampaign handles GET /v1/wallets/campaign/:campaignId
// @Summary Get wallet by campaign ID
// @Description Retrieves wallet information by campaign ID
// @Tags Wallets
// @Produce json
// @Param campaignId path string true "Campaign ID"
// @Success 200 {object} Response{result=domain.WalletResponse}
// @Failure 400 {object} Response
// @Failure 404 {object} Response
// @Router /v1/wallets/campaign/{campaignId} [get]
func (h *WalletHandler) GetWalletByCampaign(c *gin.Context) {
	campaignID := c.Param("campaignId")
	if campaignID == "" {
		c.JSON(http.StatusOK, Response{
			Code:    400,
			Message: "campaignId is required",
		})
		return
	}

	result, err := h.walletGuard.GetWalletByCampaign(c.Request.Context(), campaignID)
	if err != nil {
		logger.Error("Failed to get wallet by campaign", zap.Error(err))
		c.JSON(http.StatusOK, Response{
			Code:    404,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Wallet retrieved successfully",
		Result:  result,
	})
}

// DeleteWallet handles DELETE /v1/wallets/:walletId
// @Summary Delete a wallet
// @Description Deletes a wallet by ID (for saga rollback)
// @Tags Wallets
// @Produce json
// @Param walletId path string true "Wallet ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/wallets/{walletId} [delete]
func (h *WalletHandler) DeleteWallet(c *gin.Context) {
	walletID := c.Param("walletId")
	if walletID == "" {
		c.JSON(http.StatusOK, Response{
			Code:    400,
			Message: "walletId is required",
		})
		return
	}

	err := h.walletGuard.DeleteWallet(c.Request.Context(), walletID)
	if err != nil {
		logger.Error("Failed to delete wallet", zap.Error(err))
		c.JSON(http.StatusOK, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Wallet deleted successfully",
	})
}

// DeleteWalletByCampaign handles DELETE /v1/wallets/campaign/:campaignId
// @Summary Delete a wallet by campaign ID
// @Description Deletes a wallet by campaign ID (for saga rollback)
// @Tags Wallets
// @Produce json
// @Param campaignId path string true "Campaign ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/wallets/campaign/{campaignId} [delete]
func (h *WalletHandler) DeleteWalletByCampaign(c *gin.Context) {
	campaignID := c.Param("campaignId")
	if campaignID == "" {
		c.JSON(http.StatusOK, Response{
			Code:    400,
			Message: "campaignId is required",
		})
		return
	}

	err := h.walletGuard.DeleteWalletByCampaign(c.Request.Context(), campaignID)
	if err != nil {
		logger.Error("Failed to delete wallet by campaign", zap.Error(err))
		c.JSON(http.StatusOK, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Wallet deleted successfully",
	})
}

// FreezeWallet handles POST /v1/wallets/:walletId/freeze
// @Summary Freeze a wallet
// @Description Freezes a wallet to prevent transactions
// @Tags Wallets
// @Produce json
// @Param walletId path string true "Wallet ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/wallets/{walletId}/freeze [post]
func (h *WalletHandler) FreezeWallet(c *gin.Context) {
	walletID := c.Param("walletId")
	if walletID == "" {
		c.JSON(http.StatusOK, Response{
			Code:    400,
			Message: "walletId is required",
		})
		return
	}

	err := h.walletGuard.FreezeWallet(c.Request.Context(), walletID)
	if err != nil {
		logger.Error("Failed to freeze wallet", zap.Error(err))
		c.JSON(http.StatusOK, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Wallet frozen successfully",
	})
}

// UnfreezeWallet handles POST /v1/wallets/:walletId/unfreeze
// @Summary Unfreeze a wallet
// @Description Unfreezes a wallet to allow transactions
// @Tags Wallets
// @Produce json
// @Param walletId path string true "Wallet ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/wallets/{walletId}/unfreeze [post]
func (h *WalletHandler) UnfreezeWallet(c *gin.Context) {
	walletID := c.Param("walletId")
	if walletID == "" {
		c.JSON(http.StatusOK, Response{
			Code:    400,
			Message: "walletId is required",
		})
		return
	}

	err := h.walletGuard.UnfreezeWallet(c.Request.Context(), walletID)
	if err != nil {
		logger.Error("Failed to unfreeze wallet", zap.Error(err))
		c.JSON(http.StatusOK, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Wallet unfrozen successfully",
	})
}
