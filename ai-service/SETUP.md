# AI Service - Setup Instructions

## Bước 1: Tạo file .env

File `.env` bị gitignore, anh cần tạo thủ công:

```bash
cd d:\tamsang\ai-service
cp .env.example .env
```

Sau đó mở file `.env` và cập nhật Gemini API key:

```env
GEMINI_API_KEY=AIzaSyDuoij0mAvPqiTpxlS2sIfjqxdU3RCFu_c
ENABLE_GEMINI_MOCK=false
```

## Bước 2: Chạy AI Service

```bash
pdm run uvicorn app.main:app --host 0.0.0.0 --port 8084
```

## Bước 3: Tạo Kafka Topics

Đảm bảo Kafka broker đang chạy, sau đó tạo topics:

```bash
# Proof verification topics
kafka-topics --create --topic proof-verification-request --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1

kafka-topics --create --topic proof-verification-result --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

## Bước 4: Test với Sample Message

Gửi test message vào Kafka:

```bash
# INVOICE test
kafka-console-producer --topic proof-verification-request --bootstrap-server localhost:9092

# Paste this JSON:
{"proofId": "test-001", "imageUrl": "https://example.com/invoice.jpg", "type": "INVOICE", "context": {"campaignContext": "Hỗ trợ y tế", "withdrawalReason": "Mua thuốc"}, "timestamp": "2026-01-05T20:00:00"}
```

## Kiểm tra kết quả

```bash
kafka-console-consumer --topic proof-verification-result --bootstrap-server localhost:9092 --from-beginning
```

## Health Check

```bash
curl http://localhost:8084/health
# Expected: {"status": "healthy"}
```
