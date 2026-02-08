package httpclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"blockchain-service/pkg/logger"

	"github.com/hudl/fargo"
	"go.uber.org/zap"
)

// DonationCompleteRequest represents the request to complete a donation
type DonationCompleteRequest struct {
	DonationID      string  `json:"donationId"`
	CampaignID      string  `json:"campaignId"`
	Amount          float64 `json:"amount"`
	DonorName       string  `json:"donorName"`
	Message         string  `json:"message"`
	TransactionHash string  `json:"transactionHash"`
	BlockIndex      int64   `json:"blockIndex"`
}

// ApiResponse represents the standard API response from core-service
type ApiResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Result  interface{} `json:"result,omitempty"`
}

// CoreServiceClient handles HTTP calls to core-service
type CoreServiceClient struct {
	eurekaConn  *fargo.EurekaConnection
	httpClient  *http.Client
	serviceName string
}

// NewCoreServiceClient creates a new core-service HTTP client
func NewCoreServiceClient(eurekaURL string) *CoreServiceClient {
	conn := fargo.NewConn(eurekaURL)

	return &CoreServiceClient{
		eurekaConn:  &conn,
		serviceName: "CORE-SERVICE",
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// getServiceURL discovers core-service URL from Eureka
func (c *CoreServiceClient) getServiceURL() (string, error) {
	app, err := c.eurekaConn.GetApp(c.serviceName)
	if err != nil {
		return "", fmt.Errorf("failed to get app from Eureka: %w", err)
	}

	if len(app.Instances) == 0 {
		return "", fmt.Errorf("no instances found for %s", c.serviceName)
	}

	// Get first available instance
	instance := app.Instances[0]
	return fmt.Sprintf("http://%s:%d", instance.IPAddr, instance.Port), nil
}

// CompleteDonation calls core-service to complete donation processing
func (c *CoreServiceClient) CompleteDonation(ctx context.Context, req *DonationCompleteRequest) error {
	baseURL, err := c.getServiceURL()
	if err != nil {
		return fmt.Errorf("failed to discover core-service: %w", err)
	}

	url := fmt.Sprintf("%s/donations/complete", baseURL)

	jsonData, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	logger.Info("Calling core-service to complete donation",
		zap.String("url", url),
		zap.String("donation_id", req.DonationID),
		zap.String("campaign_id", req.CampaignID),
	)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to call core-service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	var apiResp ApiResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if apiResp.Code != 0 {
		return fmt.Errorf("core-service returned error: code=%d, message=%s", apiResp.Code, apiResp.Message)
	}

	logger.Info("Donation completed successfully in core-service",
		zap.String("donation_id", req.DonationID),
	)

	return nil
}
