package domain

import (
	"time"
)

// ContractSignKafkaRequest represents a request to sign a contract from core-service via Kafka
type ContractSignKafkaRequest struct {
	EventType         string  `json:"eventType"`
	CampaignID        string  `json:"campaignId"`
	CampaignName      string  `json:"campaignName"`
	Description       string  `json:"description"`
	TargetAmount      float64 `json:"targetAmount"`
	Currency          string  `json:"currency"`
	StartDate         string  `json:"startDate"`
	EndDate           string  `json:"endDate"`
	OrganizerID       string  `json:"organizerId"`
	OrganizerName     string  `json:"organizerName"`
	OrganizerIDNumber string  `json:"organizerIdNumber"`
}

// ToContractCreateRequest converts to ContractCreateRequest for signing
func (r *ContractSignKafkaRequest) ToContractCreateRequest() *ContractCreateRequest {
	return &ContractCreateRequest{
		CampaignID:        r.CampaignID,
		CampaignName:      r.CampaignName,
		Description:       r.Description,
		TargetAmount:      r.TargetAmount,
		Currency:          r.Currency,
		StartDate:         r.StartDate,
		EndDate:           r.EndDate,
		OrganizerID:       r.OrganizerID,
		OrganizerName:     r.OrganizerName,
		OrganizerIDNumber: r.OrganizerIDNumber,
		SignedAt:          time.Now(),
	}
}

// ContractSignedEvent represents the event published after contract is signed
type ContractSignedEvent struct {
	EventType    string    `json:"eventType"`
	ContractID   string    `json:"contractId"`
	CampaignID   string    `json:"campaignId"`
	Status       string    `json:"status"`
	SignedAt     time.Time `json:"signedAt"`
	DocumentHash string    `json:"documentHash"`
	Signature    string    `json:"signature"`
}
