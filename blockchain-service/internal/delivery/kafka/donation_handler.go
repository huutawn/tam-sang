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

// DonationEvent represents the donation event from core-service
type DonationEvent struct {
	DonationID string      `json:"donationId"`
	CampaignID string      `json:"campaignId"`
	Amount     json.Number `json:"amount"` // Use json.Number to preserve BigDecimal precision
	DonorName  string      `json:"donorName"`
	Message    string      `json:"message"`
}

// AmountFloat64 converts the Amount to float64 for calculations
func (e *DonationEvent) AmountFloat64() (float64, error) {
	return e.Amount.Float64()
}

// DonationHandler handles donation events from Kafka
type DonationHandler struct {
	ledgerAuditor     *usecase.LedgerAuditor
	coreServiceClient *httpclient.CoreServiceClient
}

// NewDonationHandler creates a new donation handler
func NewDonationHandler(
	ledgerAuditor *usecase.LedgerAuditor,
	coreServiceClient *httpclient.CoreServiceClient,
) *DonationHandler {
	return &DonationHandler{
		ledgerAuditor:     ledgerAuditor,
		coreServiceClient: coreServiceClient,
	}
}

// HandleDonationEvent processes a donation event
func (h *DonationHandler) HandleDonationEvent(ctx context.Context, eventType string, payload []byte) error {
	var event DonationEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		logger.Error("Failed to parse donation event", zap.Error(err))
		return err
	}

	// Validate UUID fields from Java (cross-service format check)
	if _, err := uuid.Parse(event.DonationID); err != nil {
		logger.Error("Invalid donationId UUID format",
			zap.String("donation_id", event.DonationID),
			zap.Error(err),
		)
		return fmt.Errorf("invalid donationId UUID: %w", err)
	}
	if _, err := uuid.Parse(event.CampaignID); err != nil {
		logger.Error("Invalid campaignId UUID format",
			zap.String("campaign_id", event.CampaignID),
			zap.Error(err),
		)
		return fmt.Errorf("invalid campaignId UUID: %w", err)
	}

	// Convert amount from json.Number to float64 (preserves BigDecimal precision during transport)
	amountFloat, err := event.AmountFloat64()
	if err != nil {
		logger.Error("Invalid amount in donation event",
			zap.String("donation_id", event.DonationID),
			zap.String("raw_amount", event.Amount.String()),
			zap.Error(err),
		)
		return fmt.Errorf("invalid amount: %w", err)
	}

	logger.Info("Processing donation event",
		zap.String("donation_id", event.DonationID),
		zap.String("campaign_id", event.CampaignID),
		zap.Float64("amount", amountFloat),
		zap.String("donor_name", event.DonorName),
	)

	// campaignId == walletId (as per user requirement)
	walletID := event.CampaignID

	// Generate transaction ID
	transactionID := uuid.New().String()

	// Create transaction event for hash-chain
	txEvent := &domain.TransactionEvent{
		EventType:     "donation",
		TransactionID: transactionID,
		WalletID:      walletID,
		Type:          "donation",
		Amount:        amountFloat,
		Currency:      "VND",
		Description:   fmt.Sprintf("Donation from %s: %s", event.DonorName, event.Message),
		Timestamp:     time.Now(),
		Metadata: map[string]interface{}{
			"donation_id": event.DonationID,
			"donor_name":  event.DonorName,
			"message":     event.Message,
		},
	}

	// Add transaction to hash-chain and update wallet balance atomically
	if err := h.ledgerAuditor.AddTransaction(ctx, txEvent); err != nil {
		logger.Error("Failed to add donation to hash-chain",
			zap.String("donation_id", event.DonationID),
			zap.String("wallet_id", walletID),
			zap.Error(err),
		)
		return err
	}

	// Get the latest block to get transaction hash
	latestHash, err := h.getLatestTransactionHash(ctx, walletID)
	if err != nil {
		logger.Warn("Failed to get latest transaction hash, continuing without it",
			zap.Error(err),
		)
	}

	// Call core-service to complete donation (update MongoDB, Redis, WebSocket)
	completeReq := &httpclient.DonationCompleteRequest{
		DonationID:      event.DonationID,
		CampaignID:      event.CampaignID,
		Amount:          amountFloat,
		DonorName:       event.DonorName,
		Message:         event.Message,
		TransactionHash: latestHash,
		BlockIndex:      0, // Will be updated if we can get it
	}

	if err := h.coreServiceClient.CompleteDonation(ctx, completeReq); err != nil {
		logger.Error("Failed to call core-service to complete donation",
			zap.String("donation_id", event.DonationID),
			zap.Error(err),
		)
		// Don't return error here - blockchain transaction is already complete
		// Core service update is not critical for consistency
	}

	logger.Info("Donation processed successfully",
		zap.String("donation_id", event.DonationID),
		zap.String("wallet_id", walletID),
		zap.String("transaction_id", transactionID),
		zap.String("transaction_hash", latestHash),
	)

	return nil
}

// getLatestTransactionHash retrieves the latest transaction hash for a wallet
func (h *DonationHandler) getLatestTransactionHash(ctx context.Context, walletID string) (string, error) {
	// Get transaction history with limit 1
	hashes, _, err := h.ledgerAuditor.GetTransactionHistory(ctx, walletID, 0, 1)
	if err != nil {
		return "", err
	}

	if len(hashes) == 0 {
		return "", fmt.Errorf("no transactions found")
	}

	return hashes[0].CurrentHash, nil
}
