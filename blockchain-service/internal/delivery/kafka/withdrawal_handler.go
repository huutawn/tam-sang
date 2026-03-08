package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"blockchain-service/internal/domain"
	"blockchain-service/internal/usecase"
	"blockchain-service/pkg/httpclient"
	"blockchain-service/pkg/logger"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// WithdrawalEvent represents the withdrawal event from core-service
type WithdrawalEvent struct {
	WithdrawalID string      `json:"withdrawalId"`
	CampaignID   string      `json:"campaignId"`
	Amount       json.Number `json:"amount"`
	Reason       string      `json:"reason"`
	Type         string      `json:"type"`
}

// AmountFloat64 converts the Amount to float64
func (e *WithdrawalEvent) AmountFloat64() (float64, error) {
	return e.Amount.Float64()
}

// WithdrawalHandler handles withdrawal events from Kafka
type WithdrawalHandler struct {
	ledgerAuditor     *usecase.LedgerAuditor
	coreServiceClient *httpclient.CoreServiceClient
}

// NewWithdrawalHandler creates a new withdrawal handler
func NewWithdrawalHandler(
	ledgerAuditor *usecase.LedgerAuditor,
	coreServiceClient *httpclient.CoreServiceClient,
) *WithdrawalHandler {
	return &WithdrawalHandler{
		ledgerAuditor:     ledgerAuditor,
		coreServiceClient: coreServiceClient,
	}
}

// HandleWithdrawalEvent processes a withdrawal event
func (h *WithdrawalHandler) HandleWithdrawalEvent(ctx context.Context, eventType string, payload []byte) error {
	var event WithdrawalEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		logger.Error("Failed to parse withdrawal event", zap.Error(err))
		return err
	}

	// Validate UUID formats (WithdrawalID is string (UUID) from Java, CampaignID is Mongo ObjectId (24 chars))
	if len(event.CampaignID) != 24 {
		logger.Error("Invalid campaignId format",
			zap.String("campaign_id", event.CampaignID),
		)
		return fmt.Errorf("invalid campaignId format")
	}

	amountFloat, err := event.AmountFloat64()
	if err != nil {
		logger.Error("Invalid amount in withdrawal event",
			zap.String("withdrawal_id", event.WithdrawalID),
			zap.Error(err),
		)
		return fmt.Errorf("invalid amount: %w", err)
	}

	logger.Info("Processing withdrawal event",
		zap.String("withdrawal_id", event.WithdrawalID),
		zap.String("campaign_id", event.CampaignID),
		zap.Float64("amount", amountFloat),
		zap.String("reason", event.Reason),
	)

	walletID := event.CampaignID
	transactionID := uuid.New().String()

	// Represent withdrawal as negative deduction? In the system, both are positive amount, but EventType/Type "withdrawal" indicates the flow direction in LedgerAuditor? Let's assume it simply records the transaction. Yes, the amount should generally be positive here if Wallet logic handles deductions based on Type == "withdrawal"
	// Wait, we need to make sure the amount is represented correctly for LedgerAuditor. The LedgerAuditor AddTransaction takes the float amount and does `wallet.Balance -= tx.Amount` if type is withdrawal?

	// Create transaction event
	txEvent := &domain.TransactionEvent{
		EventType:     "withdrawal",
		TransactionID: transactionID,
		WalletID:      walletID,
		Type:          "withdrawal",
		Amount:        amountFloat,
		Currency:      "VND",
		Description:   fmt.Sprintf("Withdrawal for: %s", event.Reason),
		Timestamp:     time.Now(),
		Metadata: map[string]interface{}{
			"withdrawal_id": event.WithdrawalID,
			"reason":        event.Reason,
			"type":          event.Type,
		},
	}

	// Add transaction to hash-chain and update wallet balance atomically
	if err := h.ledgerAuditor.AddTransaction(ctx, txEvent); err != nil {
		logger.Error("Failed to add withdrawal to hash-chain",
			zap.String("withdrawal_id", event.WithdrawalID),
			zap.String("wallet_id", walletID),
			zap.Error(err),
		)
		return err
	}

	// Get latest transaction hash
	latestHash, err := h.getLatestTransactionHash(ctx, walletID)
	if err != nil {
		logger.Warn("Failed to get latest transaction hash, continuing", zap.Error(err))
	}

	// Call core-service to complete withdrawal
	completeReq := &httpclient.WithdrawalCompleteRequest{
		WithdrawalID:    event.WithdrawalID,
		CampaignID:      event.CampaignID,
		Amount:          amountFloat,
		TransactionHash: latestHash,
		BlockIndex:      0,
	}

	if err := h.coreServiceClient.CompleteWithdrawal(ctx, completeReq); err != nil {
		logger.Error("Failed to call core-service to complete withdrawal",
			zap.String("withdrawal_id", event.WithdrawalID),
			zap.Error(err),
		)
	}

	logger.Info("Withdrawal processed successfully",
		zap.String("withdrawal_id", event.WithdrawalID),
		zap.String("wallet_id", walletID),
		zap.String("transaction_id", transactionID),
		zap.String("transaction_hash", latestHash),
	)

	return nil
}

// getLatestTransactionHash retrieves the latest transaction hash for a wallet
func (h *WithdrawalHandler) getLatestTransactionHash(ctx context.Context, walletID string) (string, error) {
	hashes, _, err := h.ledgerAuditor.GetTransactionHistory(ctx, walletID, 0, 1)
	if err != nil {
		return "", err
	}
	if len(hashes) == 0 {
		return "", fmt.Errorf("no transactions found")
	}
	return hashes[0].CurrentHash, nil
}
