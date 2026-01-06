package eureka

import (
	"fmt"
	"net"
	"strconv"
	"time"

	"file-service/config"
	"file-service/pkg/logger"
	"file-service/pkg/metrics"

	"github.com/hudl/fargo"
	"go.uber.org/zap"
)

type EurekaClient struct {
	connection *fargo.EurekaConnection
	instance   *fargo.Instance
	config     *config.EurekaConfig
	service    *config.ServiceConfig
	stopChan   chan struct{}
}

// NewEurekaClient creates a new Eureka client
func NewEurekaClient(cfg *config.Config) (*EurekaClient, error) {
	// Parse Eureka URL
	connection := fargo.NewConn(cfg.Eureka.URL)

	// Get local IP if not specified
	instanceIP := cfg.Eureka.InstanceIP
	if instanceIP == "" || instanceIP == "localhost" {
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

	client := &EurekaClient{
		connection: &connection,
		instance:   instance,
		config:     &cfg.Eureka,
		service:    &cfg.Service,
		stopChan:   make(chan struct{}),
	}

	return client, nil
}

// Register registers the service with Eureka
func (e *EurekaClient) Register() error {
	logger.Info("Registering with Eureka",
		zap.String("instance_id", e.instance.InstanceId),
		zap.String("app", e.instance.App),
		zap.String("eureka_url", e.config.URL),
	)

	err := e.connection.RegisterInstance(e.instance)
	if err != nil {
		metrics.EurekaRegistrationStatus.Set(0)
		return fmt.Errorf("failed to register with Eureka: %w", err)
	}

	metrics.EurekaRegistrationStatus.Set(1)
	logger.Info("Successfully registered with Eureka")

	// Start heartbeat
	go e.startHeartbeat()

	return nil
}

// startHeartbeat sends periodic heartbeats to Eureka
func (e *EurekaClient) startHeartbeat() {
	ticker := time.NewTicker(time.Duration(e.config.RenewalInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			err := e.connection.HeartBeatInstance(e.instance)
			if err != nil {
				logger.Error("Failed to send heartbeat to Eureka",
					zap.Error(err),
					zap.String("instance_id", e.instance.InstanceId),
				)
				metrics.EurekaRegistrationStatus.Set(0)

				// Try to re-register
				logger.Info("Attempting to re-register with Eureka")
				if err := e.connection.RegisterInstance(e.instance); err != nil {
					logger.Error("Failed to re-register with Eureka", zap.Error(err))
				} else {
					logger.Info("Successfully re-registered with Eureka")
					metrics.EurekaRegistrationStatus.Set(1)
				}
			} else {
				metrics.EurekaRegistrationStatus.Set(1)
				logger.Debug("Heartbeat sent to Eureka")
			}

		case <-e.stopChan:
			logger.Info("Stopping Eureka heartbeat")
			return
		}
	}
}

// Deregister deregisters the service from Eureka
func (e *EurekaClient) Deregister() error {
	logger.Info("Deregistering from Eureka", zap.String("instance_id", e.instance.InstanceId))

	// Stop heartbeat
	close(e.stopChan)

	// Deregister instance
	err := e.connection.DeregisterInstance(e.instance)
	if err != nil {
		return fmt.Errorf("failed to deregister from Eureka: %w", err)
	}

	metrics.EurekaRegistrationStatus.Set(0)
	logger.Info("Successfully deregistered from Eureka")

	return nil
}

// HealthCheck checks Eureka connection
func (e *EurekaClient) HealthCheck() error {
	_, err := e.connection.GetApp(e.instance.App)
	if err != nil {
		metrics.EurekaRegistrationStatus.Set(0)
		return err
	}
	return nil
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
