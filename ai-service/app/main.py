import logging
import threading
from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.config import settings
from app.kafka.consumer import kafka_consumer

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI"""
    # Startup
    logger.info(f"Starting {settings.service_name} v{settings.service_version}")

    # Start Kafka consumer in background thread
    consumer_thread = threading.Thread(target=kafka_consumer.start, daemon=True)
    consumer_thread.start()
    logger.info("Kafka consumer thread started")

    yield

    # Shutdown
    logger.info("Shutting down AI service...")
    kafka_consumer.stop()


app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="AI Service for KYC OCR Processing",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8084)
