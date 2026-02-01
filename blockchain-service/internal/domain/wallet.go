package domain

import (
	"time"

	"github.com/google/uuid"
)

// Wallet represents a campaign wallet with encrypted sensitive data
// Balance is cached here and updated on each transaction, verified by cronjob every 2 hours
type Wallet struct {
	ID                  uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CampaignID          uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"` // Wallet belongs to this campaign
	EncryptedPrivateKey string    `gorm:"type:text"`                      // AES-256 encrypted private key
	PublicKey           string    `gorm:"type:text"`
	Address             string    `gorm:"size:100;uniqueIndex"`
	EncryptedSeedPhrase string    `gorm:"type:text"`                    // AES-256 encrypted seed phrase
	Balance             float64   `gorm:"type:decimal(20,2);default:0"` // Cached balance, updated on transactions
	TotalDeposits       float64   `gorm:"type:decimal(20,2);default:0"` // Total deposits from chain
	TotalWithdrawals    float64   `gorm:"type:decimal(20,2);default:0"` // Total withdrawals from chain
	Currency            string    `gorm:"size:10;default:'VND'"`
	Status              string    `gorm:"size:20;default:'active'"` // active, frozen, closed
	LastVerifiedAt      time.Time // Last time the balance was verified against chain
	IsVerified          bool      `gorm:"default:true"` // False if chain verification failed
	CreatedAt           time.Time `gorm:"autoCreateTime"`
	UpdatedAt           time.Time `gorm:"autoUpdateTime"`
}

// TableName returns the table name for GORM
func (Wallet) TableName() string {
	return "wallets"
}

// WalletCreateRequest represents the request to create a new wallet for a campaign
type WalletCreateRequest struct {
	CampaignID string `json:"campaign_id" binding:"required"` // Campaign this wallet belongs to
	PrivateKey string `json:"private_key"`                    // Will be encrypted (optional - auto-generated if empty)
	PublicKey  string `json:"public_key"`
	SeedPhrase string `json:"seed_phrase"` // Will be encrypted (optional - auto-generated if empty)
}

// WalletResponse represents the wallet response (with balance)
type WalletResponse struct {
	ID               string    `json:"id"`
	CampaignID       string    `json:"campaign_id"`
	Address          string    `json:"address"`
	PublicKey        string    `json:"public_key"`
	Balance          float64   `json:"balance"`
	TotalDeposits    float64   `json:"total_deposits"`
	TotalWithdrawals float64   `json:"total_withdrawals"`
	Currency         string    `json:"currency"`
	Status           string    `json:"status"`
	IsVerified       bool      `json:"is_verified"`
	LastVerifiedAt   time.Time `json:"last_verified_at,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

// WalletBalanceResponse represents the calculated balance from hash-chain
type WalletBalanceResponse struct {
	WalletID          string    `json:"wallet_id"`
	CampaignID        string    `json:"campaign_id"`
	CachedBalance     float64   `json:"cached_balance"`     // Balance stored in wallet
	CalculatedBalance float64   `json:"calculated_balance"` // Calculated from hash-chain
	TotalDeposits     float64   `json:"total_deposits"`
	TotalWithdrawals  float64   `json:"total_withdrawals"`
	TransactionCount  int64     `json:"transaction_count"`
	Currency          string    `json:"currency"`
	IsVerified        bool      `json:"is_verified"`   // True if chain is valid AND balances match
	BalanceMatch      bool      `json:"balance_match"` // True if cached == calculated
	CalculatedAt      time.Time `json:"calculated_at"`
}

// WalletDecryptRequest represents a request to decrypt wallet data
type WalletDecryptRequest struct {
	WalletID string `json:"wallet_id" binding:"required"`
	DataType string `json:"data_type" binding:"required"` // private_key or seed_phrase
}

// WalletDecryptResponse represents decrypted wallet data
type WalletDecryptResponse struct {
	WalletID  string `json:"wallet_id"`
	DataType  string `json:"data_type"`
	PlainText string `json:"plain_text"` // Decrypted data
}

// EncryptRequest represents a generic encrypt request
type EncryptRequest struct {
	PlainText string `json:"plain_text" binding:"required"`
}

// EncryptResponse represents the encryption result
type EncryptResponse struct {
	CipherText string `json:"cipher_text"`
}

// DecryptRequest represents a generic decrypt request
type DecryptRequest struct {
	CipherText string `json:"cipher_text" binding:"required"`
}

// DecryptResponse represents the decryption result
type DecryptResponse struct {
	PlainText string `json:"plain_text"`
}

// WalletVerificationResult represents the result of a wallet verification
type WalletVerificationResult struct {
	WalletID          string    `json:"wallet_id"`
	CampaignID        string    `json:"campaign_id"`
	CachedBalance     float64   `json:"cached_balance"`
	CalculatedBalance float64   `json:"calculated_balance"`
	IsValid           bool      `json:"is_valid"`
	BalanceMatch      bool      `json:"balance_match"`
	ChainIntegrity    string    `json:"chain_integrity"` // VALID, TAMPERED, EMPTY
	VerifiedAt        time.Time `json:"verified_at"`
	ErrorMessage      string    `json:"error_message,omitempty"`
}
