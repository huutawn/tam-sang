package pdf

import (
	"bytes"
	"testing"
	"time"
)

func TestGenerateContractIncludesVietnameseAgreementStructure(t *testing.T) {
	generator := NewGenerator()
	now := time.Date(2026, 3, 14, 9, 30, 0, 0, time.UTC)

	content, err := generator.GenerateContract(&ContractData{
		ContractID:         "contract-001",
		CampaignID:         "campaign-001",
		CampaignName:       "Ho tro bua an cho tre em",
		Description:        "Tai tro bua an va hoc pham cho 120 tre em trong 2 thang.",
		OrganizerName:      "Nguyen Van B",
		OrganizerID:        "user-001",
		OrganizerIDNumber:  "079204001234",
		TargetAmount:       250000000,
		Currency:           "VND",
		StartDate:          now,
		EndDate:            now.AddDate(0, 2, 0),
		CreatedAt:          now,
		SignedAt:           now,
		SignatureAlgorithm: "ECDSA-SHA256",
		PublicKeyID:        "primary-key",
	})
	if err != nil {
		t.Fatalf("GenerateContract returned error: %v", err)
	}

	if len(content) == 0 {
		t.Fatal("expected generated PDF content")
	}

	expectedSnippets := [][]byte{
		[]byte("%PDF"),
		[]byte("THOA THUAN TAO VA VAN HANH CHIEN DICH THIEN NGUYEN"),
		[]byte("BEN A - DON VI VAN HANH NEN TANG"),
		[]byte("BEN B - BEN TO CHUC CHIEN DICH"),
		[]byte("IV. DIEU KHOAN THOA THUAN"),
		[]byte("VI. XAC NHAN CUA CAC BEN"),
	}

	for _, snippet := range expectedSnippets {
		if !bytes.Contains(content, snippet) {
			t.Fatalf("expected PDF to contain %q", string(snippet))
		}
	}
}
