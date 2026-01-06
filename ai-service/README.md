# AI Service

AI Service for KYC OCR Processing using Kafka event-driven architecture.

## Features

- Kafka consumer for KYC verification events
- Mock OCR processing for ID card images
- Kafka producer for analysis results
- FastAPI health check endpoints

## Setup

### Prerequisites

- Python 3.11+
- PDM (Python Development Master)
- Kafka running on localhost:9092

### Installation

```bash
# Install PDM if not already installed
pip install pdm

# Install dependencies
pdm install

# Copy environment file
cp .env.example .env
```

### Running the Service

```bash
# Using PDM
pdm run python -m app.main

# Or activate virtual environment
eval $(pdm venv activate)
python -m app.main
```

The service will start on `http://localhost:8084`

## API Endpoints

- `GET /` - Service information
- `GET /health` - Health check

## Kafka Topics

- **Consumer**: `kyc-verification` - Receives KYC initiation events
- **Producer**: `kyc-result` - Publishes OCR analysis results

## Event Schemas

### KycInitiatedEvent (Input)

```json
{
  "kycId": "uuid",
  "userId": "uuid",
  "frontImageUrl": "http://...",
  "backImageUrl": "http://...",
  "timestamp": "2025-12-28T11:45:00Z"
}
```

### KycAnalyzedEvent (Output)

```json
{
  "kycId": "uuid",
  "userId": "uuid",
  "extractedData": {
    "fullName": "NGUYEN VAN A",
    "dob": "01/01/1990",
    "idNumber": "001234567890",
    "idType": "CITIZEN_ID",
    "address": "123 ABC Street..."
  },
  "confidence": 0.95,
  "timestamp": "2025-12-28T11:45:30Z"
}
```

## Mock OCR

This service uses mock OCR for demonstration. In production, replace with:
- Tesseract OCR
- Google Cloud Vision API
- AWS Textract
- Azure Computer Vision

## Development

```bash
# Run tests
pdm run pytest

# Format code
pdm run black app/

# Lint code
pdm run ruff check app/
```
