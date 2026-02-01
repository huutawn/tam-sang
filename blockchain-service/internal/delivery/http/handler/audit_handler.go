package handler

import (
	"net/http"
	"strconv"

	"blockchain-service/internal/usecase"
	"blockchain-service/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AuditHandler handles audit-related HTTP requests
type AuditHandler struct {
	ledgerAuditor *usecase.LedgerAuditor
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(ledgerAuditor *usecase.LedgerAuditor) *AuditHandler {
	return &AuditHandler{
		ledgerAuditor: ledgerAuditor,
	}
}

// VerifyWalletChain handles GET /v1/audit/verify/:walletId
// @Summary Verify wallet transaction chain integrity
// @Description Verifies the hash-chain integrity for a wallet's transaction history
// @Tags Audit
// @Produce json
// @Param walletId path string true "Wallet ID"
// @Success 200 {object} Response{result=domain.AuditResult}
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/audit/verify/{walletId} [get]
func (h *AuditHandler) VerifyWalletChain(c *gin.Context) {
	walletID := c.Param("walletId")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "walletId is required",
		})
		return
	}

	result, err := h.ledgerAuditor.VerifyWalletChain(c.Request.Context(), walletID)
	if err != nil {
		logger.Error("Failed to verify wallet chain", zap.Error(err))
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: "Failed to verify wallet chain: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Verification completed",
		Result:  result,
	})
}

// GetTransactionHistory handles GET /v1/audit/history/:walletId
// @Summary Get wallet transaction history
// @Description Retrieves the transaction history (hash-chain) for a wallet
// @Tags Audit
// @Produce json
// @Param walletId path string true "Wallet ID"
// @Param offset query int false "Offset for pagination" default(0)
// @Param limit query int false "Limit for pagination" default(20)
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/audit/history/{walletId} [get]
func (h *AuditHandler) GetTransactionHistory(c *gin.Context) {
	walletID := c.Param("walletId")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "walletId is required",
		})
		return
	}

	// Parse pagination parameters
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if limit > 100 {
		limit = 100 // Max limit
	}
	if offset < 0 {
		offset = 0
	}

	history, total, err := h.ledgerAuditor.GetTransactionHistory(c.Request.Context(), walletID, offset, limit)
	if err != nil {
		logger.Error("Failed to get transaction history", zap.Error(err))
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: "Failed to get transaction history: " + err.Error(),
		})
		return
	}

	// Transform to response format
	blocks := make([]map[string]interface{}, len(history))
	for i, h := range history {
		blocks[i] = map[string]interface{}{
			"id":               h.ID.String(),
			"block_index":      h.BlockIndex,
			"transaction_id":   h.TransactionID.String(),
			"previous_hash":    h.PreviousHash,
			"current_hash":     h.CurrentHash,
			"transaction_data": h.TransactionData,
			"created_at":       h.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Transaction history retrieved successfully",
		Result: map[string]interface{}{
			"wallet_id": walletID,
			"blocks":    blocks,
			"total":     total,
			"offset":    offset,
			"limit":     limit,
		},
	})
}

// GetBlockCount handles GET /v1/audit/count/:walletId
// @Summary Get wallet block count
// @Description Returns the number of blocks in a wallet's hash-chain
// @Tags Audit
// @Produce json
// @Param walletId path string true "Wallet ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/audit/count/{walletId} [get]
func (h *AuditHandler) GetBlockCount(c *gin.Context) {
	walletID := c.Param("walletId")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "walletId is required",
		})
		return
	}

	count, err := h.ledgerAuditor.GetBlockCount(c.Request.Context(), walletID)
	if err != nil {
		logger.Error("Failed to get block count", zap.Error(err))
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: "Failed to get block count: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Block count retrieved successfully",
		Result: map[string]interface{}{
			"wallet_id":   walletID,
			"block_count": count,
		},
	})
}

// GetWalletBalance handles GET /v1/audit/balance/:walletId
// @Summary Get wallet balance calculated from hash-chain
// @Description Calculates the wallet balance by summing all transactions in the hash-chain.
// @Description This ensures balance integrity - nobody can tamper with the balance in database.
// @Tags Audit
// @Produce json
// @Param walletId path string true "Wallet ID"
// @Param currency query string false "Currency" default(VND)
// @Success 200 {object} Response{result=domain.WalletBalanceResponse}
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/audit/balance/{walletId} [get]
func (h *AuditHandler) GetWalletBalance(c *gin.Context) {
	walletID := c.Param("walletId")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "walletId is required",
		})
		return
	}

	currency := c.DefaultQuery("currency", "VND")

	balance, err := h.ledgerAuditor.GetWalletBalance(c.Request.Context(), walletID, currency)
	if err != nil {
		logger.Error("Failed to get wallet balance", zap.Error(err))
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: "Failed to get wallet balance: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Wallet balance calculated from chain successfully",
		Result:  balance,
	})
}

// VerifyAndGetBalance handles GET /v1/audit/verified-balance/:walletId
// @Summary Get verified wallet balance
// @Description Verifies chain integrity first, then calculates balance. Returns error if chain is tampered.
// @Tags Audit
// @Produce json
// @Param walletId path string true "Wallet ID"
// @Success 200 {object} Response{result=domain.WalletBalanceResponse}
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /v1/audit/verified-balance/{walletId} [get]
func (h *AuditHandler) VerifyAndGetBalance(c *gin.Context) {
	walletID := c.Param("walletId")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "walletId is required",
		})
		return
	}

	currency := c.DefaultQuery("currency", "VND")

	balance, err := h.ledgerAuditor.VerifyAndGetBalance(c.Request.Context(), walletID, currency)
	if err != nil {
		logger.Error("Failed to verify and get balance", zap.Error(err))
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: "Chain verification or balance calculation failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Chain verified and balance calculated successfully",
		Result:  balance,
	})
}
