package usecase

import (
	"context"
	"fmt"

	"blockchain-service/config"
	"blockchain-service/internal/domain"
	"blockchain-service/internal/repository"
	"blockchain-service/pkg/crypto"
	"blockchain-service/pkg/logger"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// WalletGuard handles wallet encryption/decryption operations
type WalletGuard struct {
	walletRepo   *repository.WalletRepository
	aesEncryptor *crypto.AESEncryptor
}

// NewWalletGuard creates a new wallet guard usecase
func NewWalletGuard(
	walletRepo *repository.WalletRepository,
	cryptoConfig *config.CryptoConfig,
) (*WalletGuard, error) {
	guard := &WalletGuard{
		walletRepo: walletRepo,
	}

	// Initialize AES encryptor
	if cryptoConfig.AES256Key != "" {
		aesEncryptor, err := crypto.NewAESEncryptor(cryptoConfig.AES256Key)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize AES encryptor: %w", err)
		}
		guard.aesEncryptor = aesEncryptor
		logger.Info("AES-256 encryptor initialized successfully")
	} else {
		logger.Warn("AES-256 key not provided, encryption will be unavailable")
	}

	return guard, nil
}

// CreateWallet creates a new wallet for a campaign with encrypted sensitive data
// NOTE: Balance is NOT stored - it's calculated from hash-chain
func (w *WalletGuard) CreateWallet(ctx context.Context, req *domain.WalletCreateRequest) (*domain.WalletResponse, error) {
	logger.Info("Creating new wallet for campaign", zap.String("campaign_id", req.CampaignID))

	if w.aesEncryptor == nil {
		return nil, fmt.Errorf("AES encryptor not initialized")
	}

	// Parse campaign ID
	campaignID, err := uuid.Parse(req.CampaignID)
	if err != nil {
		return nil, fmt.Errorf("invalid campaign ID: %w", err)
	}

	// Check if wallet already exists for campaign
	exists, err := w.walletRepo.ExistsByCampaignID(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing wallet: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("wallet already exists for campaign %s", req.CampaignID)
	}

	// Auto-generate keys if not provided (in production, use proper key generation)
	privateKey := req.PrivateKey
	publicKey := req.PublicKey
	seedPhrase := req.SeedPhrase

	// If no keys provided, generate ECDSA key pair
	if privateKey == "" {
		generatedPrivate, generatedPublic, err := crypto.GenerateECDSAKeyPair()
		if err != nil {
			return nil, fmt.Errorf("failed to generate key pair: %w", err)
		}
		privateKey = generatedPrivate
		publicKey = generatedPublic
		logger.Info("Generated ECDSA key pair for campaign wallet")
	}

	// Encrypt private key
	encryptedPrivateKey, err := w.aesEncryptor.EncryptString(privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt private key: %w", err)
	}

	// Encrypt seed phrase if provided
	var encryptedSeedPhrase string
	if seedPhrase != "" {
		encryptedSeedPhrase, err = w.aesEncryptor.EncryptString(seedPhrase)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt seed phrase: %w", err)
		}
	}

	// Generate wallet address (simplified - in production, derive from public key)
	address := fmt.Sprintf("TS%s", uuid.New().String()[:16])

	// Create wallet entity - NOTE: No Balance field, calculated from chain
	wallet := &domain.Wallet{
		ID:                  uuid.New(),
		CampaignID:          campaignID,
		EncryptedPrivateKey: encryptedPrivateKey,
		PublicKey:           publicKey,
		Address:             address,
		EncryptedSeedPhrase: encryptedSeedPhrase,
		Currency:            "VND",
		Status:              "active",
	}

	// Save wallet
	if err := w.walletRepo.Create(ctx, wallet); err != nil {
		return nil, fmt.Errorf("failed to create wallet: %w", err)
	}

	logger.Info("Wallet created successfully",
		zap.String("wallet_id", wallet.ID.String()),
		zap.String("campaign_id", req.CampaignID),
		zap.String("address", address),
	)

	return &domain.WalletResponse{
		ID:               wallet.ID.String(),
		CampaignID:       req.CampaignID,
		Address:          wallet.Address,
		PublicKey:        wallet.PublicKey,
		Balance:          wallet.Balance,
		TotalDeposits:    wallet.TotalDeposits,
		TotalWithdrawals: wallet.TotalWithdrawals,
		Currency:         wallet.Currency,
		Status:           wallet.Status,
		IsVerified:       wallet.IsVerified,
		LastVerifiedAt:   wallet.LastVerifiedAt,
		CreatedAt:        wallet.CreatedAt,
	}, nil
}

// GetWallet retrieves a wallet by ID (with balance info)
func (w *WalletGuard) GetWallet(ctx context.Context, walletID string) (*domain.WalletResponse, error) {
	id, err := uuid.Parse(walletID)
	if err != nil {
		return nil, fmt.Errorf("invalid wallet ID: %w", err)
	}

	wallet, err := w.walletRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	if wallet == nil {
		return nil, fmt.Errorf("wallet not found")
	}

	return &domain.WalletResponse{
		ID:               wallet.ID.String(),
		CampaignID:       wallet.CampaignID.String(),
		Address:          wallet.Address,
		PublicKey:        wallet.PublicKey,
		Balance:          wallet.Balance,
		TotalDeposits:    wallet.TotalDeposits,
		TotalWithdrawals: wallet.TotalWithdrawals,
		Currency:         wallet.Currency,
		Status:           wallet.Status,
		IsVerified:       wallet.IsVerified,
		LastVerifiedAt:   wallet.LastVerifiedAt,
		CreatedAt:        wallet.CreatedAt,
	}, nil
}

// GetWalletByCampaign retrieves a wallet by campaign ID
func (w *WalletGuard) GetWalletByCampaign(ctx context.Context, campaignID string) (*domain.WalletResponse, error) {
	id, err := uuid.Parse(campaignID)
	if err != nil {
		return nil, fmt.Errorf("invalid campaign ID: %w", err)
	}

	wallet, err := w.walletRepo.GetByCampaignID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	if wallet == nil {
		return nil, fmt.Errorf("wallet not found for campaign")
	}

	return &domain.WalletResponse{
		ID:               wallet.ID.String(),
		CampaignID:       wallet.CampaignID.String(),
		Address:          wallet.Address,
		PublicKey:        wallet.PublicKey,
		Balance:          wallet.Balance,
		TotalDeposits:    wallet.TotalDeposits,
		TotalWithdrawals: wallet.TotalWithdrawals,
		Currency:         wallet.Currency,
		Status:           wallet.Status,
		IsVerified:       wallet.IsVerified,
		LastVerifiedAt:   wallet.LastVerifiedAt,
		CreatedAt:        wallet.CreatedAt,
	}, nil
}

// DecryptWalletData decrypts sensitive wallet data
func (w *WalletGuard) DecryptWalletData(ctx context.Context, req *domain.WalletDecryptRequest) (*domain.WalletDecryptResponse, error) {
	if w.aesEncryptor == nil {
		return nil, fmt.Errorf("AES encryptor not initialized")
	}

	id, err := uuid.Parse(req.WalletID)
	if err != nil {
		return nil, fmt.Errorf("invalid wallet ID: %w", err)
	}

	wallet, err := w.walletRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	if wallet == nil {
		return nil, fmt.Errorf("wallet not found")
	}

	var encryptedData, plainText string
	switch req.DataType {
	case "private_key":
		encryptedData = wallet.EncryptedPrivateKey
	case "seed_phrase":
		encryptedData = wallet.EncryptedSeedPhrase
	default:
		return nil, fmt.Errorf("invalid data type: %s", req.DataType)
	}

	if encryptedData == "" {
		return nil, fmt.Errorf("no encrypted %s found", req.DataType)
	}

	plainText, err = w.aesEncryptor.DecryptString(encryptedData)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt %s: %w", req.DataType, err)
	}

	logger.Info("Wallet data decrypted",
		zap.String("wallet_id", req.WalletID),
		zap.String("data_type", req.DataType),
	)

	return &domain.WalletDecryptResponse{
		WalletID:  req.WalletID,
		DataType:  req.DataType,
		PlainText: plainText,
	}, nil
}

// Encrypt encrypts plaintext using AES-256
func (w *WalletGuard) Encrypt(ctx context.Context, plainText string) (string, error) {
	if w.aesEncryptor == nil {
		return "", fmt.Errorf("AES encryptor not initialized")
	}

	cipherText, err := w.aesEncryptor.EncryptString(plainText)
	if err != nil {
		return "", fmt.Errorf("failed to encrypt: %w", err)
	}

	return cipherText, nil
}

// Decrypt decrypts ciphertext using AES-256
func (w *WalletGuard) Decrypt(ctx context.Context, cipherText string) (string, error) {
	if w.aesEncryptor == nil {
		return "", fmt.Errorf("AES encryptor not initialized")
	}

	plainText, err := w.aesEncryptor.DecryptString(cipherText)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return plainText, nil
}

// FreezeWallet freezes a wallet
func (w *WalletGuard) FreezeWallet(ctx context.Context, walletID string) error {
	id, err := uuid.Parse(walletID)
	if err != nil {
		return fmt.Errorf("invalid wallet ID: %w", err)
	}

	if err := w.walletRepo.UpdateStatus(ctx, id, "frozen"); err != nil {
		return fmt.Errorf("failed to freeze wallet: %w", err)
	}

	logger.Info("Wallet frozen", zap.String("wallet_id", walletID))
	return nil
}

// UnfreezeWallet unfreezes a wallet
func (w *WalletGuard) UnfreezeWallet(ctx context.Context, walletID string) error {
	id, err := uuid.Parse(walletID)
	if err != nil {
		return fmt.Errorf("invalid wallet ID: %w", err)
	}

	if err := w.walletRepo.UpdateStatus(ctx, id, "active"); err != nil {
		return fmt.Errorf("failed to unfreeze wallet: %w", err)
	}

	logger.Info("Wallet unfrozen", zap.String("wallet_id", walletID))
	return nil
}

// DeleteWallet deletes a wallet by ID (for saga rollback)
func (w *WalletGuard) DeleteWallet(ctx context.Context, walletID string) error {
	id, err := uuid.Parse(walletID)
	if err != nil {
		return fmt.Errorf("invalid wallet ID: %w", err)
	}

	if err := w.walletRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete wallet: %w", err)
	}

	logger.Info("Wallet deleted", zap.String("wallet_id", walletID))
	return nil
}

// DeleteWalletByCampaign deletes a wallet by campaign ID (for saga rollback)
func (w *WalletGuard) DeleteWalletByCampaign(ctx context.Context, campaignID string) error {
	id, err := uuid.Parse(campaignID)
	if err != nil {
		return fmt.Errorf("invalid campaign ID: %w", err)
	}

	wallet, err := w.walletRepo.GetByCampaignID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to find wallet: %w", err)
	}
	if wallet == nil {
		return fmt.Errorf("wallet not found for campaign: %s", campaignID)
	}

	if err := w.walletRepo.Delete(ctx, wallet.ID); err != nil {
		return fmt.Errorf("failed to delete wallet: %w", err)
	}

	logger.Info("Wallet deleted by campaign",
		zap.String("campaign_id", campaignID),
		zap.String("wallet_id", wallet.ID.String()),
	)
	return nil
}
