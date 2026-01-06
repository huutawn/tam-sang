package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTPRequestDuration tracks HTTP request duration
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duration of HTTP requests in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	// FileUploadTotal tracks total file uploads
	FileUploadTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "file_upload_total",
			Help: "Total number of file uploads",
		},
		[]string{"status"}, // success, failure
	)

	// FileUploadSize tracks file upload sizes
	FileUploadSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "file_upload_size_bytes",
			Help:    "Size of uploaded files in bytes",
			Buckets: []float64{1024, 10240, 102400, 1048576, 10485760, 52428800}, // 1KB to 50MB
		},
		[]string{"content_type"},
	)

	// ActiveRequests tracks currently active requests
	ActiveRequests = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_requests",
			Help: "Number of currently active requests",
		},
	)

	// EurekaRegistrationStatus tracks Eureka registration status
	EurekaRegistrationStatus = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "eureka_registration_status",
			Help: "Eureka registration status (1 = registered, 0 = not registered)",
		},
	)

	// MinioConnectionStatus tracks Minio connection health
	MinioConnectionStatus = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "minio_connection_status",
			Help: "Minio connection status (1 = healthy, 0 = unhealthy)",
		},
	)
)
