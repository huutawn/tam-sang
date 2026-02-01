package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"blockchain-service/config"
	"blockchain-service/internal/domain"
	"blockchain-service/internal/repository"
	"blockchain-service/pkg/crypto"
	"blockchain-service/pkg/logger"
	"blockchain-service/pkg/pdf"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ContractSigner handles contract signing operations
type ContractSigner struct {
	contractRepo *repository.ContractRepository
	pdfGenerator *pdf.Generator
	rsaSigner    *crypto.RSASigner
	ecdsaSigner  *crypto.ECDSASigner
	config       *config.CryptoConfig
}

// NewContractSigner creates a new contract signer usecase
func NewContractSigner(
	contractRepo *repository.ContractRepository,
	cryptoConfig *config.CryptoConfig,
) (*ContractSigner, error) {
	signer := &ContractSigner{
		contractRepo: contractRepo,
		pdfGenerator: pdf.NewGenerator(),
		config:       cryptoConfig,
	}

	// Initialize signers based on available keys
	if cryptoConfig.RSAPrivateKey != "" {
		rsaSigner, err := crypto.NewRSASigner(cryptoConfig.RSAPrivateKey)
		if err != nil {
			logger.Warn("Failed to initialize RSA signer", zap.Error(err))
		} else {
			signer.rsaSigner = rsaSigner
			logger.Info("RSA signer initialized successfully")
		}
	}

	if cryptoConfig.ECDSAPrivateKey != "" {
		ecdsaSigner, err := crypto.NewECDSASigner(cryptoConfig.ECDSAPrivateKey)
		if err != nil {
			logger.Warn("Failed to initialize ECDSA signer", zap.Error(err))
		} else {
			signer.ecdsaSigner = ecdsaSigner
			logger.Info("ECDSA signer initialized successfully")
		}
	}

	return signer, nil
}

// SignContract signs a new campaign contract
func (s *ContractSigner) SignContract(ctx context.Context, req *domain.ContractCreateRequest) (*domain.ContractSignResponse, error) {
	logger.Info("Signing contract for campaign",
		zap.String("campaign_id", req.CampaignID),
		zap.String("campaign_name", req.CampaignName),
	)

	// Parse campaign ID
	campaignID, err := uuid.Parse(req.CampaignID)
	if err != nil {
		return nil, fmt.Errorf("invalid campaign ID: %w", err)
	}

	// Check if contract already exists for this campaign
	existingContract, err := s.contractRepo.GetByCampaignID(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing contract: %w", err)
	}
	if existingContract != nil {
		return nil, fmt.Errorf("contract already exists for campaign %s", req.CampaignID)
	}

	// Parse dates
	var startDate, endDate time.Time
	if req.StartDate != "" {
		startDate, _ = time.Parse(time.RFC3339, req.StartDate)
	}
	if req.EndDate != "" {
		endDate, _ = time.Parse(time.RFC3339, req.EndDate)
	}

	// Set default currency
	currency := req.Currency
	if currency == "" {
		currency = "VND"
	}

	// Generate PDF contract
	pdfData := &pdf.ContractData{
		CampaignID:    req.CampaignID,
		CampaignName:  req.CampaignName,
		Description:   req.Description,
		OrganizerName: req.OrganizerName,
		OrganizerID:   req.OrganizerID,
		TargetAmount:  req.TargetAmount,
		Currency:      currency,
		StartDate:     startDate,
		EndDate:       endDate,
		CreatedAt:     time.Now(),
	}

	pdfContent, err := s.pdfGenerator.GenerateContract(pdfData)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF contract: %w", err)
	}

	// Calculate SHA-256 hash of PDF content
	hash := sha256.Sum256(pdfContent)
	contentHash := hex.EncodeToString(hash[:])

	// Sign the hash
	var signature string
	var signatureAlg string

	switch s.config.SigningAlgorithm {
	case "RSA":
		if s.rsaSigner == nil {
			return nil, fmt.Errorf("RSA signer not initialized")
		}
		signature, err = s.rsaSigner.Sign(pdfContent)
		signatureAlg = "RSA-SHA256"
	case "ECDSA":
		fallthrough
	default:
		if s.ecdsaSigner == nil {
			return nil, fmt.Errorf("ECDSA signer not initialized")
		}
		signature, err = s.ecdsaSigner.Sign(pdfContent)
		signatureAlg = "ECDSA-SHA256"
	}

	if err != nil {
		return nil, fmt.Errorf("failed to sign contract: %w", err)
	}

	// Create contract entity
	signedAt := time.Now()
	contract := &domain.Contract{
		ID:            uuid.New(),
		CampaignID:    campaignID,
		CampaignName:  req.CampaignName,
		Description:   req.Description,
		OrganizerName: req.OrganizerName,
		OrganizerID:   req.OrganizerID,
		TargetAmount:  req.TargetAmount,
		Currency:      currency,
		Content:       pdfContent,
		ContentHash:   contentHash,
		Signature:     signature,
		SignatureAlg:  signatureAlg,
		PublicKeyID:   "primary-key", // Could be made configurable for key rotation
		SignedAt:      signedAt,
		StartDate:     startDate,
		EndDate:       endDate,
	}

	// Save contract
	if err := s.contractRepo.Create(ctx, contract); err != nil {
		return nil, fmt.Errorf("failed to save contract: %w", err)
	}

	logger.Info("Contract signed successfully",
		zap.String("contract_id", contract.ID.String()),
		zap.String("content_hash", contentHash),
		zap.String("algorithm", signatureAlg),
	)

	return &domain.ContractSignResponse{
		ContractID:   contract.ID.String(),
		CampaignID:   req.CampaignID,
		ContentHash:  contentHash,
		Signature:    signature,
		SignatureAlg: signatureAlg,
		SignedAt:     signedAt,
		PublicKeyID:  contract.PublicKeyID,
	}, nil
}

// VerifyContract verifies a contract's signature
func (s *ContractSigner) VerifyContract(ctx context.Context, contractID string) (bool, error) {
	id, err := uuid.Parse(contractID)
	if err != nil {
		return false, fmt.Errorf("invalid contract ID: %w", err)
	}

	contract, err := s.contractRepo.GetByID(ctx, id)
	if err != nil {
		return false, fmt.Errorf("failed to get contract: %w", err)
	}
	if contract == nil {
		return false, fmt.Errorf("contract not found")
	}

	// Verify based on signature algorithm
	switch contract.SignatureAlg {
	case "RSA-SHA256":
		if s.rsaSigner == nil {
			return false, fmt.Errorf("RSA signer not initialized")
		}
		return s.rsaSigner.Verify(contract.Content, contract.Signature) == nil, nil
	case "ECDSA-SHA256":
		if s.ecdsaSigner == nil {
			return false, fmt.Errorf("ECDSA signer not initialized")
		}
		return s.ecdsaSigner.Verify(contract.Content, contract.Signature) == nil, nil
	default:
		return false, fmt.Errorf("unknown signature algorithm: %s", contract.SignatureAlg)
	}
}

// GetContract retrieves a contract by ID
func (s *ContractSigner) GetContract(ctx context.Context, contractID string) (*domain.Contract, error) {
	id, err := uuid.Parse(contractID)
	if err != nil {
		return nil, fmt.Errorf("invalid contract ID: %w", err)
	}

	contract, err := s.contractRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}
	if contract == nil {
		return nil, fmt.Errorf("contract not found")
	}

	return contract, nil
}

// GetContractByCampaign retrieves a contract by campaign ID
func (s *ContractSigner) GetContractByCampaign(ctx context.Context, campaignID string) (*domain.Contract, error) {
	id, err := uuid.Parse(campaignID)
	if err != nil {
		return nil, fmt.Errorf("invalid campaign ID: %w", err)
	}

	contract, err := s.contractRepo.GetByCampaignID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}
	if contract == nil {
		return nil, fmt.Errorf("contract not found for campaign")
	}

	return contract, nil
}
