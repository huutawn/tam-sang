from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Kafka Configuration
    kafka_bootstrap_servers: str = "kafka:29092"
    kafka_group_id: str = "ai-service-group"
    
    # KYC Verification Topics
    kafka_topic_verification: str = "kyc-verification"
    kafka_topic_result: str = "kyc-result"
    
    # Proof Verification Topics
    kafka_topic_proof_verification: str = "proof-verification-request"
    kafka_topic_proof_result: str = "proof-verification-result"
    
    # Hybrid Reasoning Topic
    kafka_topic_hybrid_reasoning: str = "hybrid-reasoning-request"
    
    # Face Verification Topic
    kafka_topic_face_verification: str = "face-verification-request"
    
    # Gemini API Configuration
    gemini_api_key: str = ""
    enable_gemini_mock: bool = False
    
    # Vector Database Configuration (pgvector)
    vector_db_host: str = "postgres-tamsang"
    vector_db_port: int = 5432
    vector_db_name: str = "tamsang_vector_db"
    vector_db_user: str = "postgres"
    vector_db_password: str = "tamsangpswd"
    
    # Core Service Callback Configuration
    # Note: core-service uses random port via Eureka; set this via .env in production
    core_service_url: str = "http://api-gateway:8080"
    callback_endpoint: str = "/proofs/internal/hybrid-callback"
    face_verification_callback_endpoint: str = "/withdrawals/internal/face-verification-callback"
    callback_timeout: int = 30  # seconds
    callback_retry_count: int = 3
    
    # CLIP Model Configuration
    clip_model_name: str = "openai/clip-vit-base-patch32"
    similarity_threshold: float = 0.85  # For deduplication
    
    # Service Configuration
    log_level: str = "INFO"
    service_name: str = "ai-service"
    service_version: str = "1.0.0"
    service_host: str = "0.0.0.0"
    service_port: int = 8084
    service_instance_host: str = "localhost"

    # Eureka Registration
    eureka_url: str = "http://localhost:8761/eureka"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
