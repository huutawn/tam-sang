package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"blockchain-service/internal/domain"
	"blockchain-service/internal/repository"
	"blockchain-service/pkg/database"
	"blockchain-service/pkg/hashchain"
	"blockchain-service/pkg/kafka"
	"blockchain-service/pkg/logger"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// LedgerAuditor handles hash-chain ledger verification and transaction management
type LedgerAuditor struct {
	txHashRepo    *repository.TransactionHashRepository
	walletRepo    *repository.WalletRepository
	auditProducer *kafka.Producer
	db            *database.Database
}

// NewLedgerAuditor creates a new ledger auditor usecase
func NewLedgerAuditor(
	txHashRepo *repository.TransactionHashRepository,
	walletRepo *repository.WalletRepository,
	auditProducer *kafka.Producer,
	db *database.Database,
) *LedgerAuditor {
	return &LedgerAuditor{
		txHashRepo:    txHashRepo,
		walletRepo:    walletRepo,
		auditProducer: auditProducer,
		db:            db,
	}
}

// VerifyWalletChain verifies the integrity of a wallet's transaction chain
func (l *LedgerAuditor) VerifyWalletChain(ctx context.Context, walletID string) (*domain.AuditResult, error) {
	logger.Info("Verifying wallet chain integrity", zap.String("wallet_id", walletID))

	// Parse wallet ID
	wID := walletID

	// Get all transaction hashes for the wallet
	hashes, err := l.txHashRepo.GetByWalletID(ctx, wID)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction hashes: %w", err)
	}

	result := &domain.AuditResult{
		WalletID:      walletID,
		TotalBlocks:   int64(len(hashes)),
		VerifiedAt:    time.Now(),
		InvalidBlocks: make([]domain.InvalidBlock, 0),
	}

	// Empty chain is valid
	if len(hashes) == 0 {
		result.IsValid = true
		result.ChainIntegrity = "EMPTY"
		logger.Info("Wallet chain is empty", zap.String("wallet_id", walletID))
		return result, nil
	}

	// Convert to hashchain blocks for verification
	blocks := make([]*hashchain.Block, len(hashes))
	for i, h := range hashes {
		blocks[i] = &hashchain.Block{
			Index:        h.BlockIndex,
			PreviousHash: h.PreviousHash,
			CurrentHash:  h.CurrentHash,
			Data:         h.TransactionData,
			Timestamp:    h.CreatedAt,
		}
	}

	// Validate each block
	for i, block := range blocks {
		// Check if current block's hash is valid
		expectedHash := hashchain.ComputeHash(block.PreviousHash, block.Data, block.Timestamp)
		if block.CurrentHash != expectedHash {
			result.InvalidBlocks = append(result.InvalidBlocks, domain.InvalidBlock{
				BlockIndex:   block.Index,
				ExpectedHash: expectedHash,
				ActualHash:   block.CurrentHash,
				Reason:       "Hash mismatch",
			})
		}

		// Check if previous hash matches (except for genesis)
		if i > 0 {
			previousBlock := blocks[i-1]
			if block.PreviousHash != previousBlock.CurrentHash {
				result.InvalidBlocks = append(result.InvalidBlocks, domain.InvalidBlock{
					BlockIndex:   block.Index,
					ExpectedHash: previousBlock.CurrentHash,
					ActualHash:   block.PreviousHash,
					Reason:       "Previous hash mismatch",
				})
			}
		} else {
			// Genesis block should have "0" as previous hash
			if block.PreviousHash != "0" {
				result.InvalidBlocks = append(result.InvalidBlocks, domain.InvalidBlock{
					BlockIndex:   block.Index,
					ExpectedHash: "0",
					ActualHash:   block.PreviousHash,
					Reason:       "Genesis block has invalid previous hash",
				})
			}
		}
	}

	// Determine chain integrity
	if len(result.InvalidBlocks) == 0 {
		result.IsValid = true
		result.ChainIntegrity = "VALID"
		logger.Info("Wallet chain is valid",
			zap.String("wallet_id", walletID),
			zap.Int64("total_blocks", result.TotalBlocks),
		)
	} else {
		result.IsValid = false
		result.ChainIntegrity = "TAMPERED"
		logger.Warn("Wallet chain is tampered",
			zap.String("wallet_id", walletID),
			zap.Int64("total_blocks", result.TotalBlocks),
			zap.Int("invalid_blocks", len(result.InvalidBlocks)),
		)
	}

	// Publish audit result to Kafka if producer is available
	if l.auditProducer != nil {
		auditEvent := &domain.AuditResultEvent{
			EventType:      "audit-result",
			WalletID:       walletID,
			IsValid:        result.IsValid,
			TotalBlocks:    result.TotalBlocks,
			VerifiedAt:     result.VerifiedAt,
			InvalidCount:   len(result.InvalidBlocks),
			ChainIntegrity: result.ChainIntegrity,
		}

		if err := l.auditProducer.Publish(ctx, walletID, auditEvent); err != nil {
			logger.Error("Failed to publish audit result to Kafka",
				zap.String("wallet_id", walletID),
				zap.Error(err),
			)
			// Don't return error, just log it
		}
	}

	return result, nil
}

// AddTransaction adds a new transaction to the wallet's hash chain with locking
// This method locks the wallet row, updates balance, and creates the hash block atomically
func (l *LedgerAuditor) AddTransaction(ctx context.Context, event *domain.TransactionEvent) error {
	logger.Info("Adding transaction to chain",
		zap.String("wallet_id", event.WalletID),
		zap.String("transaction_id", event.TransactionID),
		zap.String("type", event.Type),
		zap.Float64("amount", event.Amount),
	)

	// Parse IDs
	walletID := event.WalletID

	transactionID, err := uuid.Parse(event.TransactionID)
	if err != nil {
		return fmt.Errorf("invalid transaction ID: %w", err)
	}

	// Start transaction for atomic balance update
	tx := l.db.DB.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to start transaction: %w", tx.Error)
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Lock the wallet row for update
	var wallet domain.Wallet
	if err := tx.Set("gorm:query_option", "FOR UPDATE").
		First(&wallet, "id = ?", walletID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to lock wallet: %w", err)
	}

	// Check wallet status
	if wallet.Status != "active" {
		tx.Rollback()
		return fmt.Errorf("wallet is not active: %s", wallet.Status)
	}

	// Get the latest block for this wallet
	latestBlock, err := l.txHashRepo.GetLatestByWalletID(ctx, walletID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to get latest block: %w", err)
	}

	// Prepare transaction data
	txData := hashchain.TransactionData{
		Type:          event.Type,
		TransactionID: event.TransactionID,
		WalletID:      event.WalletID,
		Amount:        event.Amount,
		Currency:      event.Currency,
		Description:   event.Description,
		Timestamp:     event.Timestamp,
		Metadata:      event.Metadata,
	}

	dataJSON, err := json.Marshal(txData)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to serialize transaction data: %w", err)
	}

	// Create new block
	var previousHash string
	var blockIndex int64

	if latestBlock == nil {
		// Genesis block
		previousHash = "0"
		blockIndex = 0
	} else {
		previousHash = latestBlock.CurrentHash
		blockIndex = latestBlock.BlockIndex + 1
	}

	timestamp := time.Now()
	currentHash := hashchain.ComputeHash(previousHash, string(dataJSON), timestamp)

	// Create transaction hash entity
	txHash := &domain.TransactionHash{
		ID:              uuid.New(),
		WalletID:        walletID,
		TransactionID:   transactionID,
		PreviousHash:    previousHash,
		CurrentHash:     currentHash,
		TransactionData: string(dataJSON),
		BlockIndex:      blockIndex,
		CreatedAt:       timestamp,
	}

	// Save hash block to database
	if err := tx.Create(txHash).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to save transaction hash: %w", err)
	}

	// Calculate new balance based on transaction type
	newBalance := wallet.Balance
	newTotalDeposits := wallet.TotalDeposits
	newTotalWithdrawals := wallet.TotalWithdrawals

	switch event.Type {
	case "deposit", "donation":
		newBalance += event.Amount
		newTotalDeposits += event.Amount
	case "withdrawal", "expense":
		if wallet.Balance < event.Amount {
			tx.Rollback()
			return fmt.Errorf("insufficient balance: have %.2f, need %.2f", wallet.Balance, event.Amount)
		}
		newBalance -= event.Amount
		newTotalWithdrawals += event.Amount
	case "genesis":
		// Genesis block, no balance change
	default:
		logger.Warn("Unknown transaction type, no balance update",
			zap.String("type", event.Type),
		)
	}

	// Update wallet balance
	if err := tx.Model(&domain.Wallet{}).
		Where("id = ?", walletID).
		Updates(map[string]interface{}{
			"balance":           newBalance,
			"total_deposits":    newTotalDeposits,
			"total_withdrawals": newTotalWithdrawals,
		}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update wallet balance: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	logger.Info("Transaction added to chain and balance updated",
		zap.String("wallet_id", event.WalletID),
		zap.String("transaction_id", event.TransactionID),
		zap.Int64("block_index", blockIndex),
		zap.Float64("old_balance", wallet.Balance),
		zap.Float64("new_balance", newBalance),
		zap.String("current_hash", currentHash),
	)

	return nil
}

// GetTransactionHistory retrieves the transaction history for a wallet
func (l *LedgerAuditor) GetTransactionHistory(ctx context.Context, walletID string, offset, limit int) ([]domain.TransactionHash, int64, error) {
	wID := walletID

	return l.txHashRepo.GetByWalletIDPaginated(ctx, wID, offset, limit)
}

// GetBlockCount returns the number of blocks for a wallet
func (l *LedgerAuditor) GetBlockCount(ctx context.Context, walletID string) (int64, error) {
	wID := walletID

	return l.txHashRepo.CountByWalletID(ctx, wID)
}

// GetWalletBalance calculates the wallet balance from the hash-chain
func (l *LedgerAuditor) GetWalletBalance(ctx context.Context, walletID string, currency string) (*domain.WalletBalanceResponse, error) {
	logger.Info("Calculating wallet balance from chain", zap.String("wallet_id", walletID))

	wID := walletID

	// Get wallet for cached balance
	wallet, err := l.walletRepo.GetByID(ctx, wID)
	if err != nil {
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	if wallet == nil {
		return nil, fmt.Errorf("wallet not found")
	}

	// Get all transactions for this wallet
	hashes, err := l.txHashRepo.GetByWalletID(ctx, wID)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction hashes: %w", err)
	}

	// Calculate balance from transactions
	var totalDeposits, totalWithdrawals float64
	isVerified := true

	for i, h := range hashes {
		// Parse transaction data
		var txData hashchain.TransactionData
		if err := json.Unmarshal([]byte(h.TransactionData), &txData); err != nil {
			logger.Warn("Failed to parse transaction data",
				zap.Int64("block_index", h.BlockIndex),
				zap.Error(err),
			)
			continue
		}

		// Verify hash integrity while calculating
		expectedHash := hashchain.ComputeHash(h.PreviousHash, h.TransactionData, h.CreatedAt)
		if h.CurrentHash != expectedHash {
			isVerified = false
			logger.Warn("Hash mismatch detected during balance calculation",
				zap.Int64("block_index", h.BlockIndex),
				zap.String("expected", expectedHash),
				zap.String("actual", h.CurrentHash),
			)
		}

		// Verify chain linkage
		if i > 0 {
			prevHash := hashes[i-1]
			if h.PreviousHash != prevHash.CurrentHash {
				isVerified = false
			}
		}

		// Calculate amounts based on transaction type
		switch txData.Type {
		case "deposit", "donation":
			totalDeposits += txData.Amount
		case "withdrawal", "expense":
			totalWithdrawals += txData.Amount
		case "genesis":
			// Genesis block, no amount change
		default:
			// Unknown type, log but continue
			logger.Warn("Unknown transaction type",
				zap.String("type", txData.Type),
				zap.Int64("block_index", h.BlockIndex),
			)
		}
	}

	calculatedBalance := totalDeposits - totalWithdrawals
	balanceMatch := wallet.Balance == calculatedBalance

	logger.Info("Wallet balance calculated",
		zap.String("wallet_id", walletID),
		zap.Float64("cached_balance", wallet.Balance),
		zap.Float64("calculated_balance", calculatedBalance),
		zap.Float64("deposits", totalDeposits),
		zap.Float64("withdrawals", totalWithdrawals),
		zap.Int64("transactions", int64(len(hashes))),
		zap.Bool("verified", isVerified),
		zap.Bool("balance_match", balanceMatch),
	)

	return &domain.WalletBalanceResponse{
		WalletID:          walletID,
		CampaignID:        wallet.CampaignID,
		CachedBalance:     wallet.Balance,
		CalculatedBalance: calculatedBalance,
		TotalDeposits:     totalDeposits,
		TotalWithdrawals:  totalWithdrawals,
		TransactionCount:  int64(len(hashes)),
		Currency:          currency,
		IsVerified:        isVerified,
		BalanceMatch:      balanceMatch,
		CalculatedAt:      time.Now(),
	}, nil
}

// VerifyAndGetBalance verifies the chain integrity AND calculates balance
func (l *LedgerAuditor) VerifyAndGetBalance(ctx context.Context, walletID string, currency string) (*domain.WalletBalanceResponse, error) {
	// First verify chain integrity
	auditResult, err := l.VerifyWalletChain(ctx, walletID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify chain: %w", err)
	}

	if !auditResult.IsValid {
		return nil, fmt.Errorf("chain integrity check failed: %s", auditResult.ChainIntegrity)
	}

	// Chain is valid, calculate balance
	return l.GetWalletBalance(ctx, walletID, currency)
}
