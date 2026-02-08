package repository

import (
	"context"
	"fmt"

	"blockchain-service/internal/domain"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// WalletRepository handles wallet persistence
type WalletRepository struct {
	db *gorm.DB
}

// NewWalletRepository creates a new wallet repository
func NewWalletRepository(db *gorm.DB) *WalletRepository {
	return &WalletRepository{db: db}
}

// Create saves a new wallet
func (r *WalletRepository) Create(ctx context.Context, wallet *domain.Wallet) error {
	if err := r.db.WithContext(ctx).Create(wallet).Error; err != nil {
		return fmt.Errorf("failed to create wallet: %w", err)
	}
	return nil
}

// GetByID retrieves a wallet by ID
func (r *WalletRepository) GetByID(ctx context.Context, id string) (*domain.Wallet, error) {
	var wallet domain.Wallet
	if err := r.db.WithContext(ctx).First(&wallet, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	return &wallet, nil
}

// GetByIDForUpdate retrieves a wallet by ID with row lock for transaction safety
func (r *WalletRepository) GetByIDForUpdate(ctx context.Context, id string) (*domain.Wallet, error) {
	var wallet domain.Wallet
	if err := r.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&wallet, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get wallet for update: %w", err)
	}
	return &wallet, nil
}

// GetByCampaignID retrieves a wallet by campaign ID
func (r *WalletRepository) GetByCampaignID(ctx context.Context, campaignID string) (*domain.Wallet, error) {
	var wallet domain.Wallet
	if err := r.db.WithContext(ctx).First(&wallet, "campaign_id = ?", campaignID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get wallet by campaign ID: %w", err)
	}
	return &wallet, nil
}

// GetByCampaignIDForUpdate retrieves a wallet by campaign ID with row lock
func (r *WalletRepository) GetByCampaignIDForUpdate(ctx context.Context, campaignID string) (*domain.Wallet, error) {
	var wallet domain.Wallet
	if err := r.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&wallet, "campaign_id = ?", campaignID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get wallet for update: %w", err)
	}
	return &wallet, nil
}

// GetByAddress retrieves a wallet by address
func (r *WalletRepository) GetByAddress(ctx context.Context, address string) (*domain.Wallet, error) {
	var wallet domain.Wallet
	if err := r.db.WithContext(ctx).First(&wallet, "address = ?", address).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get wallet by address: %w", err)
	}
	return &wallet, nil
}

// Update updates an existing wallet
func (r *WalletRepository) Update(ctx context.Context, wallet *domain.Wallet) error {
	if err := r.db.WithContext(ctx).Save(wallet).Error; err != nil {
		return fmt.Errorf("failed to update wallet: %w", err)
	}
	return nil
}

// UpdateBalance updates wallet balance and amounts
func (r *WalletRepository) UpdateBalance(ctx context.Context, id string, balance, totalDeposits, totalWithdrawals float64) error {
	if err := r.db.WithContext(ctx).
		Model(&domain.Wallet{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"balance":           balance,
			"total_deposits":    totalDeposits,
			"total_withdrawals": totalWithdrawals,
		}).Error; err != nil {
		return fmt.Errorf("failed to update wallet balance: %w", err)
	}
	return nil
}

// UpdateVerificationStatus updates wallet verification status
func (r *WalletRepository) UpdateVerificationStatus(ctx context.Context, id string, isVerified bool, verifiedAt interface{}) error {
	if err := r.db.WithContext(ctx).
		Model(&domain.Wallet{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_verified":      isVerified,
			"last_verified_at": verifiedAt,
		}).Error; err != nil {
		return fmt.Errorf("failed to update verification status: %w", err)
	}
	return nil
}

// UpdateStatus updates wallet status
func (r *WalletRepository) UpdateStatus(ctx context.Context, id string, status string) error {
	if err := r.db.WithContext(ctx).
		Model(&domain.Wallet{}).
		Where("id = ?", id).
		Update("status", status).Error; err != nil {
		return fmt.Errorf("failed to update wallet status: %w", err)
	}
	return nil
}

// List retrieves wallets with pagination
func (r *WalletRepository) List(ctx context.Context, offset, limit int) ([]domain.Wallet, int64, error) {
	var wallets []domain.Wallet
	var total int64

	// Count total
	if err := r.db.WithContext(ctx).Model(&domain.Wallet{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count wallets: %w", err)
	}

	// Fetch with pagination
	if err := r.db.WithContext(ctx).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&wallets).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list wallets: %w", err)
	}

	return wallets, total, nil
}

// ListAll retrieves all wallets (for cronjob verification)
func (r *WalletRepository) ListAll(ctx context.Context) ([]domain.Wallet, error) {
	var wallets []domain.Wallet
	if err := r.db.WithContext(ctx).
		Where("status = ?", "active").
		Find(&wallets).Error; err != nil {
		return nil, fmt.Errorf("failed to list all wallets: %w", err)
	}
	return wallets, nil
}

// Delete deletes a wallet by ID
func (r *WalletRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&domain.Wallet{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete wallet: %w", err)
	}
	return nil
}

// ExistsByCampaignID checks if a wallet exists for a campaign
func (r *WalletRepository) ExistsByCampaignID(ctx context.Context, campaignID string) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&domain.Wallet{}).
		Where("campaign_id = ?", campaignID).
		Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to check wallet existence: %w", err)
	}
	return count > 0, nil
}

// BeginTransaction starts a new database transaction
func (r *WalletRepository) BeginTransaction() *gorm.DB {
	return r.db.Begin()
}
