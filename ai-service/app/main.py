import logging
import threading
from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.config import settings
from app.kafka.consumer import kafka_consumer
import py_eureka_client.eureka_client as eureka_client

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

    # Register with Eureka
    try:
        await eureka_client.init_async(
            eureka_server=settings.eureka_url,
            app_name=settings.service_name,
            instance_port=8084,
            instance_host="localhost", # Or get from env if running in Docker
        )
        logger.info(f"Registered with Eureka at {settings.eureka_url}")
    except Exception as e:
        logger.error(f"Failed to register with Eureka: {e}")

    # Start Kafka consumer in background thread
    consumer_thread = threading.Thread(target=kafka_consumer.start, daemon=True)
    consumer_thread.start()
    logger.info("Kafka consumer thread started")

    yield

    # Shutdown — release all long-lived resources
    logger.info("Shutting down AI service...")
    
    # Deregister from Eureka
    try:
        await eureka_client.stop_async()
        logger.info("Deregistered from Eureka")
    except Exception as e:
        logger.warning(f"Error deregistering from Eureka: {e}")

    kafka_consumer.stop()

    # Close Vector DB connection pool (BUG-10 fix)
    try:
        from app.services.vector_db import vector_db_service
        await vector_db_service.close()
        logger.info("Vector DB connection pool closed")
    except Exception as e:
        logger.warning("Error closing Vector DB pool: %s", e)

    # Close Hybrid Reasoning httpx client (BUG-10 fix)
    try:
        from app.services.hybrid_reasoning import hybrid_reasoning_service
        await hybrid_reasoning_service.close()
        logger.info("Hybrid reasoning HTTP client closed")
    except Exception as e:
        logger.warning("Error closing hybrid reasoning client: %s", e)


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

