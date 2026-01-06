# File Service

Enterprise-grade file upload microservice built with Go (Gin framework), featuring Minio object storage and Eureka service discovery.

## Features

- ✅ **RESTful API** - Clean API design with versioning (v1)
- ✅ **File Upload** - Single and batch file upload support
- ✅ **Object Storage** - Minio S3-compatible storage
- ✅ **Service Discovery** - Eureka client integration
- ✅ **Observability** - Structured logging (Zap) and Prometheus metrics
- ✅ **Security** - File validation, sanitization, CORS, rate limiting
- ✅ **Health Checks** - Liveness and readiness probes
- ✅ **Graceful Shutdown** - Proper resource cleanup
- ✅ **Docker Support** - Multi-stage builds with security best practices

## Architecture

```
file-service/
├── config/          # Configuration management
├── eureka/          # Eureka service discovery client
├── handlers/        # HTTP request handlers
├── middleware/      # Gin middleware (logging, recovery, request ID)
├── models/          # Data models and error types
├── pkg/
│   ├── logger/      # Structured logging
│   └── metrics/     # Prometheus metrics
├── storage/         # Minio storage service
├── utils/           # Utility functions (validation, response helpers)
└── main.go          # Application entry point
```

## API Endpoints

### File Operations

- `POST /api/v1/files/upload` - Upload single file
- `POST /api/v1/files/upload/batch` - Upload multiple files

### Health & Monitoring

- `GET /health` - Liveness probe
- `GET /health/ready` - Readiness probe (checks Minio, Eureka)
- `GET /metrics` - Prometheus metrics

## Quick Start

### Prerequisites

- Go 1.21+
- Docker & Docker Compose
- Eureka Server running on port 8761
- Minio (included in docker-compose)

### Local Development

1. **Clone and navigate to directory:**
   ```bash
   cd d:/tamsang/file-service
   ```

2. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Start Minio:**
   ```bash
   docker-compose up -d minio
   ```

4. **Install dependencies:**
   ```bash
   go mod download
   ```

5. **Run the service:**
   ```bash
   go run main.go
   ```

The service will be available at `http://localhost:8083`

### Docker Deployment

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f file-service

# Stop services
docker-compose down
```

## Configuration

Configuration is managed through environment variables. See `.env.example` for all available options.

Key configurations:
- `SERVICE_PORT` - HTTP server port (default: 8083)
- `EUREKA_URL` - Eureka server URL
- `MINIO_ENDPOINT` - Minio server endpoint
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 50MB)
- `ALLOWED_MIME_TYPES` - Comma-separated list of allowed MIME types

## API Usage Examples

### Upload Single File

```bash
curl -X POST http://localhost:8083/api/v1/files/upload \
  -F "file=@document.pdf" \
  -H "Content-Type: multipart/form-data"
```

Response:
```json
{
  "code": 200,
  "message": "File uploaded successfully",
  "data": {
    "file_id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "http://localhost:9000/file-service-bucket/2025/12/27/550e8400_document.pdf",
    "filename": "document.pdf",
    "size": 1024000,
    "content_type": "application/pdf",
    "checksum": "9a0364b9e99bb480dd25e1f0284c8555",
    "uploaded_at": "2025-12-27T20:30:00Z"
  },
  "timestamp": "2025-12-27T20:30:00Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

### Upload Multiple Files

```bash
curl -X POST http://localhost:8083/api/v1/files/upload/batch \
  -F "files=@file1.jpg" \
  -F "files=@file2.png" \
  -H "Content-Type: multipart/form-data"
```

### Via API Gateway

```bash
curl -X POST http://localhost:8080/file/api/v1/files/upload \
  -F "file=@image.jpg"
```

## Monitoring

### Prometheus Metrics

Access metrics at `http://localhost:8083/metrics`

Key metrics:
- `http_request_duration_seconds` - Request duration histogram
- `file_upload_total` - Total file uploads (success/failure)
- `file_upload_size_bytes` - File size histogram
- `active_requests` - Currently active requests
- `eureka_registration_status` - Eureka registration status
- `minio_connection_status` - Minio connection health

### Structured Logs

Logs are output in JSON format (production) or console format (development):

```json
{
  "level": "info",
  "ts": "2025-12-27T20:30:00.000Z",
  "msg": "HTTP request",
  "request_id": "550e8400-e29b-41d4-a716-446655440001",
  "method": "POST",
  "path": "/api/v1/files/upload",
  "status": 200,
  "duration": "0.123s"
}
```

## Security

- **File Validation** - Size limits and MIME type whitelisting
- **Filename Sanitization** - Prevents path traversal attacks
- **CORS** - Configurable allowed origins
- **MD5 Checksum** - File integrity verification
- **Non-root Container** - Docker runs as non-root user
- **Rate Limiting** - Configurable request limits

## Integration with Microservices

### Eureka Registration

The service automatically registers with Eureka on startup:
- Service name: `FILE-SERVICE`
- Health check URL: `http://<host>:8083/health`
- Heartbeat interval: 5 seconds

### API Gateway Integration

Add route to `GatewayConfig.java`:

```java
@Bean
public RouterFunction<ServerResponse> fileServiceRoute() {
    return route("file-service")
            .route(request -> request.path().startsWith("/file"), 
                   request -> {
                       ServiceInstance instance = loadBalancerClient.choose("FILE-SERVICE");
                       if (instance == null) {
                           return ServerResponse.notFound().build();
                       }
                       String uri = instance.getUri().toString();
                       return HandlerFunctions.http(uri).handle(request);
                   })
            .filter(stripPrefix(1))
            .build();
}
```

## Troubleshooting

### Service won't start
- Check Eureka server is running on port 8761
- Verify Minio is accessible
- Check logs: `docker-compose logs file-service`

### Files not uploading
- Check file size limits in configuration
- Verify MIME type is in allowed list
- Check Minio bucket exists and is accessible

### Eureka registration fails
- Verify `EUREKA_URL` is correct
- Check network connectivity to Eureka server
- Review Eureka server logs

## License

Copyright © 2025
