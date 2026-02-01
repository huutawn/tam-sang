package hashchain

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"
)

// Block represents a single block in the hash chain
type Block struct {
	Index        int64     `json:"index"`
	PreviousHash string    `json:"previous_hash"`
	Timestamp    time.Time `json:"timestamp"`
	Data         string    `json:"data"` // JSON-encoded transaction data
	CurrentHash  string    `json:"current_hash"`
}

// ComputeHash computes SHA-256 hash for the block
func ComputeHash(previousHash, data string, timestamp time.Time) string {
	record := previousHash + data + timestamp.UTC().Format(time.RFC3339Nano)
	h := sha256.Sum256([]byte(record))
	return hex.EncodeToString(h[:])
}

// NewGenesisBlock creates the first block in the chain
func NewGenesisBlock(walletID string) *Block {
	timestamp := time.Now().UTC()
	data := fmt.Sprintf(`{"type":"genesis","wallet_id":"%s"}`, walletID)
	currentHash := ComputeHash("0", data, timestamp)

	return &Block{
		Index:        0,
		PreviousHash: "0",
		Timestamp:    timestamp,
		Data:         data,
		CurrentHash:  currentHash,
	}
}

// NewBlock creates a new block with the given data
func NewBlock(previousBlock *Block, data string) *Block {
	timestamp := time.Now().UTC()
	currentHash := ComputeHash(previousBlock.CurrentHash, data, timestamp)

	return &Block{
		Index:        previousBlock.Index + 1,
		PreviousHash: previousBlock.CurrentHash,
		Timestamp:    timestamp,
		Data:         data,
		CurrentHash:  currentHash,
	}
}

// ValidateBlock checks if a block's hash is valid
func ValidateBlock(block *Block) bool {
	expectedHash := ComputeHash(block.PreviousHash, block.Data, block.Timestamp)
	return block.CurrentHash == expectedHash
}

// ValidateChain validates the entire chain of blocks
// Returns true if valid, false otherwise with the index of the first invalid block
func ValidateChain(blocks []*Block) (bool, int64) {
	if len(blocks) == 0 {
		return true, -1
	}

	// Validate genesis block
	if !ValidateBlock(blocks[0]) {
		return false, 0
	}

	// Genesis block should have "0" as previous hash
	if blocks[0].PreviousHash != "0" {
		return false, 0
	}

	// Validate each subsequent block
	for i := 1; i < len(blocks); i++ {
		currentBlock := blocks[i]
		previousBlock := blocks[i-1]

		// Check if current block's hash is valid
		if !ValidateBlock(currentBlock) {
			return false, currentBlock.Index
		}

		// Check if previous hash matches
		if currentBlock.PreviousHash != previousBlock.CurrentHash {
			return false, currentBlock.Index
		}

		// Check if indices are sequential
		if currentBlock.Index != previousBlock.Index+1 {
			return false, currentBlock.Index
		}
	}

	return true, -1
}

// TransactionData represents standardized transaction data
type TransactionData struct {
	Type          string                 `json:"type"` // deposit, withdrawal, transfer
	TransactionID string                 `json:"transaction_id"`
	WalletID      string                 `json:"wallet_id"`
	Amount        float64                `json:"amount"`
	Currency      string                 `json:"currency"`
	Description   string                 `json:"description,omitempty"`
	Timestamp     time.Time              `json:"timestamp"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

// ToJSON serializes transaction data to JSON string
func (t *TransactionData) ToJSON() (string, error) {
	data, err := json.Marshal(t)
	if err != nil {
		return "", fmt.Errorf("failed to serialize transaction data: %w", err)
	}
	return string(data), nil
}

// ParseTransactionData parses JSON string to TransactionData
func ParseTransactionData(jsonStr string) (*TransactionData, error) {
	var data TransactionData
	if err := json.Unmarshal([]byte(jsonStr), &data); err != nil {
		return nil, fmt.Errorf("failed to parse transaction data: %w", err)
	}
	return &data, nil
}
