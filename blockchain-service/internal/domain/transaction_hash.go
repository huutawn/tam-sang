package domain

import (
	"time"

	"github.com/google/uuid"
)

// TransactionHash represents a block in the hash chain ledger
type TransactionHash struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	WalletID        uuid.UUID `gorm:"type:uuid;not null;index:idx_wallet_block"`
	TransactionID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	PreviousHash    string    `gorm:"size:64"`            // Hash of previous block, "0" for genesis
	CurrentHash     string    `gorm:"size:64;not null"`   // SHA-256 hash of this block
	TransactionData string    `gorm:"type:text;not null"` // JSON-encoded transaction data
	BlockIndex      int64     `gorm:"not null;index:idx_wallet_block"`
	CreatedAt       time.Time `gorm:"autoCreateTime"`
}

// TableName returns the table name for GORM
func (TransactionHash) TableName() string {
	return "transaction_hashes"
}

// AuditResult represents the result of chain verification
type AuditResult struct {
	WalletID       string         `json:"wallet_id"`
	IsValid        bool           `json:"is_valid"`
	TotalBlocks    int64          `json:"total_blocks"`
	VerifiedAt     time.Time      `json:"verified_at"`
	InvalidBlocks  []InvalidBlock `json:"invalid_blocks,omitempty"`
	ChainIntegrity string         `json:"chain_integrity"` // VALID, TAMPERED, EMPTY
}

// InvalidBlock represents a block that failed validation
type InvalidBlock struct {
	BlockIndex   int64  `json:"block_index"`
	ExpectedHash string `json:"expected_hash"`
	ActualHash   string `json:"actual_hash"`
	Reason       string `json:"reason"`
}

// TransactionEvent represents a transaction event from Kafka
type TransactionEvent struct {
	EventType     string                 `json:"event_type"`
	TransactionID string                 `json:"transaction_id"`
	WalletID      string                 `json:"wallet_id"`
	Type          string                 `json:"type"` // deposit, withdrawal, transfer
	Amount        float64                `json:"amount"`
	Currency      string                 `json:"currency"`
	Description   string                 `json:"description"`
	Timestamp     time.Time              `json:"timestamp"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

// AuditResultEvent represents the audit result event to publish to Kafka
type AuditResultEvent struct {
	EventType      string    `json:"event_type"`
	WalletID       string    `json:"wallet_id"`
	IsValid        bool      `json:"is_valid"`
	TotalBlocks    int64     `json:"total_blocks"`
	VerifiedAt     time.Time `json:"verified_at"`
	InvalidCount   int       `json:"invalid_count"`
	ChainIntegrity string    `json:"chain_integrity"`
}
