package repository

import (
	"context"
	"fmt"

	"blockchain-service/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ContractRepository handles contract persistence
type ContractRepository struct {
	db *gorm.DB
}

// NewContractRepository creates a new contract repository
func NewContractRepository(db *gorm.DB) *ContractRepository {
	return &ContractRepository{db: db}
}

// Create saves a new contract
func (r *ContractRepository) Create(ctx context.Context, contract *domain.Contract) error {
	if err := r.db.WithContext(ctx).Create(contract).Error; err != nil {
		return fmt.Errorf("failed to create contract: %w", err)
	}
	return nil
}

// GetByID retrieves a contract by ID
func (r *ContractRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Contract, error) {
	var contract domain.Contract
	if err := r.db.WithContext(ctx).First(&contract, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}
	return &contract, nil
}

// GetByCampaignID retrieves a contract by campaign ID
func (r *ContractRepository) GetByCampaignID(ctx context.Context, campaignID uuid.UUID) (*domain.Contract, error) {
	var contract domain.Contract
	if err := r.db.WithContext(ctx).First(&contract, "campaign_id = ?", campaignID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get contract by campaign ID: %w", err)
	}
	return &contract, nil
}

// GetByHash retrieves a contract by content hash
func (r *ContractRepository) GetByHash(ctx context.Context, hash string) (*domain.Contract, error) {
	var contract domain.Contract
	if err := r.db.WithContext(ctx).First(&contract, "content_hash = ?", hash).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get contract by hash: %w", err)
	}
	return &contract, nil
}

// List retrieves contracts with pagination
func (r *ContractRepository) List(ctx context.Context, offset, limit int) ([]domain.Contract, int64, error) {
	var contracts []domain.Contract
	var total int64

	// Count total
	if err := r.db.WithContext(ctx).Model(&domain.Contract{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count contracts: %w", err)
	}

	// Fetch with pagination
	if err := r.db.WithContext(ctx).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&contracts).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list contracts: %w", err)
	}

	return contracts, total, nil
}

// Update updates an existing contract
func (r *ContractRepository) Update(ctx context.Context, contract *domain.Contract) error {
	if err := r.db.WithContext(ctx).Save(contract).Error; err != nil {
		return fmt.Errorf("failed to update contract: %w", err)
	}
	return nil
}

// Delete deletes a contract by ID
func (r *ContractRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).Delete(&domain.Contract{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete contract: %w", err)
	}
	return nil
}
