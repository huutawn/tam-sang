package repository

import (
	"context"
	"fmt"

	"blockchain-service/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TransactionHashRepository handles transaction hash persistence (hash-chain ledger)
type TransactionHashRepository struct {
	db *gorm.DB
}

// NewTransactionHashRepository creates a new transaction hash repository
func NewTransactionHashRepository(db *gorm.DB) *TransactionHashRepository {
	return &TransactionHashRepository{db: db}
}

// Create saves a new transaction hash block
func (r *TransactionHashRepository) Create(ctx context.Context, hash *domain.TransactionHash) error {
	if err := r.db.WithContext(ctx).Create(hash).Error; err != nil {
		return fmt.Errorf("failed to create transaction hash: %w", err)
	}
	return nil
}

// GetByID retrieves a transaction hash by ID
func (r *TransactionHashRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.TransactionHash, error) {
	var hash domain.TransactionHash
	if err := r.db.WithContext(ctx).First(&hash, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get transaction hash: %w", err)
	}
	return &hash, nil
}

// GetByTransactionID retrieves a transaction hash by transaction ID
func (r *TransactionHashRepository) GetByTransactionID(ctx context.Context, txID uuid.UUID) (*domain.TransactionHash, error) {
	var hash domain.TransactionHash
	if err := r.db.WithContext(ctx).First(&hash, "transaction_id = ?", txID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get transaction hash by transaction ID: %w", err)
	}
	return &hash, nil
}

// GetByWalletID retrieves all transaction hashes for a wallet, ordered by block index
func (r *TransactionHashRepository) GetByWalletID(ctx context.Context, walletID string) ([]domain.TransactionHash, error) {
	var hashes []domain.TransactionHash
	if err := r.db.WithContext(ctx).
		Where("wallet_id = ?", walletID).
		Order("block_index ASC").
		Find(&hashes).Error; err != nil {
		return nil, fmt.Errorf("failed to get transaction hashes by wallet ID: %w", err)
	}
	return hashes, nil
}

// GetLatestByWalletID retrieves the latest (highest block index) transaction hash for a wallet
func (r *TransactionHashRepository) GetLatestByWalletID(ctx context.Context, walletID string) (*domain.TransactionHash, error) {
	var hash domain.TransactionHash
	if err := r.db.WithContext(ctx).
		Where("wallet_id = ?", walletID).
		Order("block_index DESC").
		First(&hash).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get latest transaction hash: %w", err)
	}
	return &hash, nil
}

// CountByWalletID returns the count of blocks for a wallet
func (r *TransactionHashRepository) CountByWalletID(ctx context.Context, walletID string) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&domain.TransactionHash{}).
		Where("wallet_id = ?", walletID).
		Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count transaction hashes: %w", err)
	}
	return count, nil
}

// GetByWalletIDPaginated retrieves transaction hashes with pagination
func (r *TransactionHashRepository) GetByWalletIDPaginated(ctx context.Context, walletID string, offset, limit int) ([]domain.TransactionHash, int64, error) {
	var hashes []domain.TransactionHash
	var total int64

	// Count total
	if err := r.db.WithContext(ctx).
		Model(&domain.TransactionHash{}).
		Where("wallet_id = ?", walletID).
		Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count transaction hashes: %w", err)
	}

	// Fetch with pagination
	if err := r.db.WithContext(ctx).
		Where("wallet_id = ?", walletID).
		Order("block_index DESC").
		Offset(offset).
		Limit(limit).
		Find(&hashes).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list transaction hashes: %w", err)
	}

	return hashes, total, nil
}

// GetBlockRange retrieves blocks within a specific index range for a wallet
func (r *TransactionHashRepository) GetBlockRange(ctx context.Context, walletID string, startIndex, endIndex int64) ([]domain.TransactionHash, error) {
	var hashes []domain.TransactionHash
	if err := r.db.WithContext(ctx).
		Where("wallet_id = ? AND block_index >= ? AND block_index <= ?", walletID, startIndex, endIndex).
		Order("block_index ASC").
		Find(&hashes).Error; err != nil {
		return nil, fmt.Errorf("failed to get block range: %w", err)
	}
	return hashes, nil
}

// DeleteByWalletID deletes all transaction hashes for a wallet (use with caution)
func (r *TransactionHashRepository) DeleteByWalletID(ctx context.Context, walletID string) error {
	if err := r.db.WithContext(ctx).
		Delete(&domain.TransactionHash{}, "wallet_id = ?", walletID).Error; err != nil {
		return fmt.Errorf("failed to delete transaction hashes: %w", err)
	}
	return nil
}
