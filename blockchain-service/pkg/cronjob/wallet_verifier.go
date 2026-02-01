package cronjob

import (
	"context"
	"sync"
	"time"

	"blockchain-service/internal/domain"
	"blockchain-service/internal/repository"
	"blockchain-service/pkg/hashchain"
	"blockchain-service/pkg/kafka"
	"blockchain-service/pkg/logger"

	"encoding/json"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// WalletVerifier handles periodic wallet verification
type WalletVerifier struct {
	walletRepo    *repository.WalletRepository
	txHashRepo    *repository.TransactionHashRepository
	auditProducer *kafka.Producer
	interval      time.Duration
	stopChan      chan struct{}
	wg            sync.WaitGroup
	isRunning     bool
	mu            sync.Mutex
}

// NewWalletVerifier creates a new wallet verifier cronjob
func NewWalletVerifier(
	walletRepo *repository.WalletRepository,
	txHashRepo *repository.TransactionHashRepository,
	auditProducer *kafka.Producer,
	intervalHours int,
) *WalletVerifier {
	if intervalHours <= 0 {
		intervalHours = 2 // Default 2 hours
	}

	return &WalletVerifier{
		walletRepo:    walletRepo,
		txHashRepo:    txHashRepo,
		auditProducer: auditProducer,
		interval:      time.Duration(intervalHours) * time.Hour,
		stopChan:      make(chan struct{}),
	}
}

// Start begins the periodic verification
func (v *WalletVerifier) Start(ctx context.Context) {
	v.mu.Lock()
	if v.isRunning {
		v.mu.Unlock()
		return
	}
	v.isRunning = true
	v.mu.Unlock()

	logger.Info("Starting wallet verification cronjob",
		zap.Duration("interval", v.interval),
	)

	v.wg.Add(1)
	go func() {
		defer v.wg.Done()

		// Run immediately on start
		v.runVerification(ctx)

		ticker := time.NewTicker(v.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				v.runVerification(ctx)
			case <-v.stopChan:
				logger.Info("Wallet verification cronjob stopped")
				return
			case <-ctx.Done():
				logger.Info("Wallet verification cronjob context cancelled")
				return
			}
		}
	}()
}

// Stop stops the periodic verification
func (v *WalletVerifier) Stop() {
	v.mu.Lock()
	if !v.isRunning {
		v.mu.Unlock()
		return
	}
	v.isRunning = false
	v.mu.Unlock()

	close(v.stopChan)
	v.wg.Wait()
	logger.Info("Wallet verification cronjob shutdown complete")
}

// runVerification runs verification for all active wallets
func (v *WalletVerifier) runVerification(ctx context.Context) {
	logger.Info("Starting wallet verification cycle")
	startTime := time.Now()

	// Get all active wallets
	wallets, err := v.walletRepo.ListAll(ctx)
	if err != nil {
		logger.Error("Failed to list wallets for verification", zap.Error(err))
		return
	}

	logger.Info("Found wallets to verify", zap.Int("count", len(wallets)))

	var verified, failed, tampered int

	for _, wallet := range wallets {
		result := v.verifyWallet(ctx, &wallet)

		if result.IsValid && result.BalanceMatch {
			verified++
		} else if !result.IsValid {
			tampered++
			logger.Warn("Wallet chain tampered detected",
				zap.String("wallet_id", wallet.ID.String()),
				zap.String("campaign_id", wallet.CampaignID.String()),
				zap.String("chain_integrity", result.ChainIntegrity),
			)
		} else if !result.BalanceMatch {
			failed++
			logger.Warn("Wallet balance mismatch detected",
				zap.String("wallet_id", wallet.ID.String()),
				zap.Float64("cached", result.CachedBalance),
				zap.Float64("calculated", result.CalculatedBalance),
			)
		}

		// Publish audit result to Kafka
		if v.auditProducer != nil {
			v.publishAuditResult(ctx, &result)
		}
	}

	duration := time.Since(startTime)
	logger.Info("Wallet verification cycle completed",
		zap.Int("total", len(wallets)),
		zap.Int("verified", verified),
		zap.Int("failed", failed),
		zap.Int("tampered", tampered),
		zap.Duration("duration", duration),
	)
}

// verifyWallet verifies a single wallet and updates its status
func (v *WalletVerifier) verifyWallet(ctx context.Context, wallet *domain.Wallet) domain.WalletVerificationResult {
	result := domain.WalletVerificationResult{
		WalletID:      wallet.ID.String(),
		CampaignID:    wallet.CampaignID.String(),
		CachedBalance: wallet.Balance,
		VerifiedAt:    time.Now(),
	}

	// Get all transaction hashes for the wallet
	hashes, err := v.txHashRepo.GetByWalletID(ctx, wallet.ID)
	if err != nil {
		result.IsValid = false
		result.ErrorMessage = err.Error()
		v.walletRepo.UpdateVerificationStatus(ctx, wallet.ID, false, time.Now())
		return result
	}

	// Empty chain is valid with zero balance
	if len(hashes) == 0 {
		result.IsValid = true
		result.BalanceMatch = wallet.Balance == 0
		result.CalculatedBalance = 0
		result.ChainIntegrity = "EMPTY"
		v.walletRepo.UpdateVerificationStatus(ctx, wallet.ID, result.BalanceMatch, time.Now())
		return result
	}

	// Verify chain and calculate balance
	var totalDeposits, totalWithdrawals float64
	chainValid := true

	for i, h := range hashes {
		// Verify hash
		expectedHash := hashchain.ComputeHash(h.PreviousHash, h.TransactionData, h.CreatedAt)
		if h.CurrentHash != expectedHash {
			chainValid = false
			result.ChainIntegrity = "TAMPERED"
			break
		}

		// Verify chain linkage
		if i > 0 && h.PreviousHash != hashes[i-1].CurrentHash {
			chainValid = false
			result.ChainIntegrity = "TAMPERED"
			break
		}

		// Calculate amounts
		var txData hashchain.TransactionData
		if err := json.Unmarshal([]byte(h.TransactionData), &txData); err != nil {
			continue
		}

		switch txData.Type {
		case "deposit", "donation":
			totalDeposits += txData.Amount
		case "withdrawal", "expense":
			totalWithdrawals += txData.Amount
		}
	}

	calculatedBalance := totalDeposits - totalWithdrawals
	result.CalculatedBalance = calculatedBalance
	result.IsValid = chainValid

	if chainValid {
		result.ChainIntegrity = "VALID"
	}

	// Check if cached balance matches calculated
	result.BalanceMatch = wallet.Balance == calculatedBalance

	// Update wallet verification status
	isVerified := chainValid && result.BalanceMatch
	v.walletRepo.UpdateVerificationStatus(ctx, wallet.ID, isVerified, time.Now())

	// If there's a balance mismatch but chain is valid, fix the cached balance
	if chainValid && !result.BalanceMatch {
		logger.Warn("Fixing wallet balance mismatch",
			zap.String("wallet_id", wallet.ID.String()),
			zap.Float64("old_balance", wallet.Balance),
			zap.Float64("correct_balance", calculatedBalance),
		)
		v.walletRepo.UpdateBalance(ctx, wallet.ID, calculatedBalance, totalDeposits, totalWithdrawals)
	}

	return result
}

// publishAuditResult publishes the verification result to Kafka
func (v *WalletVerifier) publishAuditResult(ctx context.Context, result *domain.WalletVerificationResult) {
	event := &domain.AuditResultEvent{
		EventType:      "wallet-verified",
		WalletID:       result.WalletID,
		IsValid:        result.IsValid && result.BalanceMatch,
		TotalBlocks:    0,
		VerifiedAt:     result.VerifiedAt,
		InvalidCount:   0,
		ChainIntegrity: result.ChainIntegrity,
	}

	if err := v.auditProducer.Publish(ctx, result.WalletID, event); err != nil {
		logger.Error("Failed to publish verification result",
			zap.String("wallet_id", result.WalletID),
			zap.Error(err),
		)
	}
}

// VerifyWalletNow verifies a single wallet immediately
func (v *WalletVerifier) VerifyWalletNow(ctx context.Context, walletID string) (*domain.WalletVerificationResult, error) {
	id, err := uuid.Parse(walletID)
	if err != nil {
		return nil, err
	}

	wallet, err := v.walletRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if wallet == nil {
		return nil, nil
	}

	result := v.verifyWallet(ctx, wallet)
	return &result, nil
}
