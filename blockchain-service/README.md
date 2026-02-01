# Blockchain Service

## Mô tả (Description)

**Blockchain Service** là một "Trusted Security Layer" cho dự án từ thiện "Tam Sang", cung cấp các tính năng:

- **Digital Contract Signer**: Ký số hợp đồng PDF bằng RSA/ECDSA
- **Immutable Ledger Auditor**: Xác minh tính toàn vẹn của chuỗi giao dịch (hash-chain)
- **Wallet Guard**: Mã hóa/giải mã dữ liệu ví bằng AES-256-GCM

## Kiến trúc (Architecture)

Service được xây dựng theo **Clean Architecture** với các tầng:

```
blockchain-service/
├── cmd/server/              # Entry point
├── config/                  # Configuration
├── internal/
│   ├── domain/              # Entities & DTOs
│   ├── repository/          # Data access
│   ├── usecase/             # Business logic
│   └── delivery/http/       # HTTP handlers & router
└── pkg/
    ├── crypto/              # AES, RSA, ECDSA
    ├── hashchain/           # Hash-chain logic
    ├── pdf/                 # PDF generator
    ├── kafka/               # Kafka client
    ├── eureka/              # Service discovery
    ├── logger/              # Structured logging
    └── database/            # PostgreSQL
```

## Cài đặt (Installation)

### Yêu cầu (Prerequisites)

- Go 1.21+
- PostgreSQL 15+
- Kafka (optional, for async events)
- Eureka Server (for service discovery)

### Cấu hình (Configuration)

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Tạo cryptographic keys:

```bash
# Generate AES-256 key
openssl rand -base64 32

# Generate ECDSA key pair (recommended)
openssl ecparam -name prime256v1 -genkey -noout -out ec_private.pem
openssl ec -in ec_private.pem -pubout -out ec_public.pem
base64 -w 0 ec_private.pem  # For ECDSA_PRIVATE_KEY
base64 -w 0 ec_public.pem   # For ECDSA_PUBLIC_KEY

# Or generate RSA key pair
openssl genrsa -out rsa_private.pem 2048
openssl rsa -in rsa_private.pem -pubout -out rsa_public.pem
base64 -w 0 rsa_private.pem  # For RSA_PRIVATE_KEY
base64 -w 0 rsa_public.pem   # For RSA_PUBLIC_KEY
```

3. Cập nhật `.env` với các keys đã tạo.

### Chạy service (Run)

```bash
# Download dependencies
go mod download

# Run the service
go run cmd/server/main.go
```

### Docker

```bash
# Build image
docker build -t blockchain-service:latest .

# Run container
docker run -d \
  --name blockchain-service \
  -p 8085:8085 \
  --env-file .env \
  blockchain-service:latest
```

## API Endpoints

### Contract Signing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/contracts/sign` | Sign a new campaign contract |
| GET | `/v1/contracts/:contractId` | Get contract metadata |
| GET | `/v1/contracts/:contractId/verify` | Verify contract signature |
| GET | `/v1/contracts/:contractId/download` | Download signed PDF |
| GET | `/v1/contracts/campaign/:campaignId` | Get contract by campaign |

### Audit & Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/audit/verify/:walletId` | Verify wallet chain integrity |
| GET | `/v1/audit/history/:walletId` | Get transaction history |
| GET | `/v1/audit/count/:walletId` | Get block count |

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/ready` | Readiness check |
| GET | `/health/live` | Liveness check |
| GET | `/metrics` | Prometheus metrics |

## API Examples

### Sign Contract

```bash
curl -X POST http://localhost:8085/v1/contracts/sign \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "campaign_name": "Hỗ trợ trẻ em vùng cao",
    "description": "Chiến dịch quyên góp cho trẻ em vùng cao",
    "organizer_name": "Nguyễn Văn A",
    "organizer_id": "ORG001",
    "target_amount": 100000000,
    "currency": "VND",
    "start_date": "2026-01-01T00:00:00Z",
    "end_date": "2026-03-31T23:59:59Z"
  }'
```

Response:
```json
{
  "code": 0,
  "message": "Contract signed successfully",
  "result": {
    "contract_id": "123e4567-e89b-12d3-a456-426614174000",
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "content_hash": "a1b2c3d4e5f6...",
    "signature": "MEUCIQDk...",
    "signature_algorithm": "ECDSA-SHA256",
    "signed_at": "2026-01-21T14:00:00Z",
    "public_key_id": "primary-key"
  }
}
```

### Verify Wallet Chain

```bash
curl http://localhost:8085/v1/audit/verify/550e8400-e29b-41d4-a716-446655440000
```

Response:
```json
{
  "code": 0,
  "message": "Verification completed",
  "result": {
    "wallet_id": "550e8400-e29b-41d4-a716-446655440000",
    "is_valid": true,
    "total_blocks": 150,
    "verified_at": "2026-01-21T14:00:00Z",
    "chain_integrity": "VALID",
    "invalid_blocks": []
  }
}
```

## Kafka Integration

### Topics

- **transaction-events** (Consumer): Listens for new transaction events
- **audit-results** (Producer): Publishes audit verification results

### Event Format

Transaction Event:
```json
{
  "event_type": "transaction-created",
  "transaction_id": "uuid",
  "wallet_id": "uuid",
  "type": "deposit|withdrawal|transfer",
  "amount": 100000,
  "currency": "VND",
  "description": "Donation for campaign X",
  "timestamp": "2026-01-21T14:00:00Z"
}
```

## Security

- **RSA-2048 / ECDSA P-256**: Digital signatures cho contracts
- **SHA-256**: Hashing cho documents và hash-chain
- **AES-256-GCM**: Authenticated encryption cho sensitive data
- All keys stored in environment variables, never in code

## License

MIT License - Tam Sang Project
