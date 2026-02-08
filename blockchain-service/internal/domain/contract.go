package domain

import (
	"time"

	"github.com/google/uuid"
)

// Contract represents a digitally signed campaign contract
type Contract struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CampaignID    string    `gorm:"type:varchar(100);not null;index"`
	CampaignName  string    `gorm:"size:255;not null"`
	Description   string    `gorm:"type:text"`
	OrganizerName string    `gorm:"size:255;not null"`
	OrganizerID   string    `gorm:"size:100"`
	TargetAmount  float64   `gorm:"type:decimal(20,2)"`
	Currency      string    `gorm:"size:10;default:'VND'"`
	Content       []byte    `gorm:"type:bytea"`         // Signed PDF content
	ContentHash   string    `gorm:"size:64;not null"`   // SHA-256 hash of PDF
	Signature     string    `gorm:"type:text;not null"` // Digital signature (base64)
	SignatureAlg  string    `gorm:"size:20;not null"`   // RSA or ECDSA
	PublicKeyID   string    `gorm:"size:100"`           // Reference to the public key used
	SignedAt      time.Time `gorm:"not null"`
	StartDate     time.Time
	EndDate       time.Time
	CreatedAt     time.Time `gorm:"autoCreateTime"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime"`
}

// TableName returns the table name for GORM
func (Contract) TableName() string {
	return "contracts"
}

// ContractCreateRequest represents the request to sign a new contract
type ContractCreateRequest struct {
	CampaignID        string    `json:"campaign_id" binding:"required"`
	CampaignName      string    `json:"campaign_name" binding:"required"`
	Description       string    `json:"description"`
	OrganizerName     string    `json:"organizer_name" binding:"required"`
	OrganizerID       string    `json:"organizer_id"`
	OrganizerIDNumber string    `json:"organizer_id_number"`
	TargetAmount      float64   `json:"target_amount"`
	Currency          string    `json:"currency"`
	StartDate         string    `json:"start_date"`
	EndDate           string    `json:"end_date"`
	SignedAt          time.Time `json:"-"` // Internal use only
}

// ContractSignResponse represents the response after signing a contract
type ContractSignResponse struct {
	ContractID   string    `json:"contract_id"`
	CampaignID   string    `json:"campaign_id"`
	ContentHash  string    `json:"content_hash"`
	Signature    string    `json:"signature"`
	SignatureAlg string    `json:"signature_algorithm"`
	SignedAt     time.Time `json:"signed_at"`
	PublicKeyID  string    `json:"public_key_id"`
}
