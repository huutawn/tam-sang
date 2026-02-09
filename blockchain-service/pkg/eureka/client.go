package eureka

import (
	"fmt"
	"net"
	"strconv"
	"time"

	"blockchain-service/config"
	"blockchain-service/pkg/logger"

	"github.com/hudl/fargo"
	"go.uber.org/zap"
)

// Client represents the Eureka client
type Client struct {
	connection *fargo.EurekaConnection
	instance   *fargo.Instance
	config     *config.EurekaConfig
	service    *config.ServiceConfig
	stopChan   chan struct{}
}

// NewClient creates a new Eureka client
func NewClient(cfg *config.Config) (*Client, error) {
	// Create Eureka connection
	connection := fargo.NewConn(cfg.Eureka.URL)

	// Get local IP if not specified
	instanceIP := cfg.Eureka.InstanceIP
	if instanceIP == "" {
		ip, err := getLocalIP()
		if err != nil {
			logger.Warn("Failed to get local IP, using localhost", zap.Error(err))
			instanceIP = "localhost"
		} else {
			instanceIP = ip
		}
	}

	// Parse port
	port, err := strconv.Atoi(cfg.Service.Port)
	if err != nil {
		return nil, fmt.Errorf("invalid service port: %w", err)
	}

	// Create instance
	instance := &fargo.Instance{
		InstanceId:       fmt.Sprintf("%s:%s:%d", instanceIP, cfg.Service.Name, port),
		HostName:         instanceIP,
		App:              cfg.Service.Name,
		IPAddr:           instanceIP,
		VipAddress:       cfg.Service.Name,
		SecureVipAddress: cfg.Service.Name,
		Status:           fargo.UP,
		Port:             port,
		PortEnabled:      true,
		HealthCheckUrl:   fmt.Sprintf("http://%s:%d/health", instanceIP, port),
		StatusPageUrl:    fmt.Sprintf("http://%s:%d/health", instanceIP, port),
		HomePageUrl:      fmt.Sprintf("http://%s:%d/", instanceIP, port),
		DataCenterInfo: fargo.DataCenterInfo{
			Name:  fargo.MyOwn,
			Class: "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
		},
		LeaseInfo: fargo.LeaseInfo{
			RenewalIntervalInSecs: int32(cfg.Eureka.RenewalInterval),
			DurationInSecs:        int32(cfg.Eureka.Duration),
		},
	}

	client := &Client{
		connection: &connection,
		instance:   instance,
		config:     &cfg.Eureka,
		service:    &cfg.Service,
		stopChan:   make(chan struct{}),
	}

	return client, nil
}

// Register registers the service with Eureka
func (c *Client) Register() error {
	logger.Info("Registering with Eureka",
		zap.String("instance_id", c.instance.InstanceId),
		zap.String("app", c.instance.App),
		zap.String("eureka_url", c.config.URL),
	)

	err := c.connection.RegisterInstance(c.instance)
	if err != nil {
		return fmt.Errorf("failed to register with Eureka: %w", err)
	}

	logger.Info("Successfully registered with Eureka")

	// Start heartbeat goroutine
	go c.startHeartbeat()

	return nil
}

// startHeartbeat sends periodic heartbeats to Eureka
func (c *Client) startHeartbeat() {
	ticker := time.NewTicker(time.Duration(c.config.RenewalInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			err := c.connection.HeartBeatInstance(c.instance)
			if err != nil {
				logger.Error("Failed to send heartbeat to Eureka",
					zap.Error(err),
					zap.String("instance_id", c.instance.InstanceId),
				)

				// Try to re-register
				logger.Info("Attempting to re-register with Eureka")
				if err := c.connection.RegisterInstance(c.instance); err != nil {
					logger.Error("Failed to re-register with Eureka", zap.Error(err))
				} else {
					logger.Info("Successfully re-registered with Eureka")
				}
			} else {
				logger.Debug("Heartbeat sent to Eureka")
			}

		case <-c.stopChan:
			logger.Info("Stopping Eureka heartbeat")
			return
		}
	}
}

// Deregister deregisters the service from Eureka
func (c *Client) Deregister() error {
	logger.Info("Deregistering from Eureka", zap.String("instance_id", c.instance.InstanceId))

	// Stop heartbeat
	close(c.stopChan)

	// Deregister instance
	err := c.connection.DeregisterInstance(c.instance)
	if err != nil {
		return fmt.Errorf("failed to deregister from Eureka: %w", err)
	}

	logger.Info("Successfully deregistered from Eureka")

	return nil
}

// HealthCheck checks Eureka connection
func (c *Client) HealthCheck() error {
	_, err := c.connection.GetApp(c.instance.App)
	return err
}

// getLocalIP gets the local IP address
func getLocalIP() (string, error) {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", err
	}

	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String(), nil
			}
		}
	}

	return "", fmt.Errorf("no non-loopback IP address found")
}
