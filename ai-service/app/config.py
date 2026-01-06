from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Kafka Configuration
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_group_id: str = "ai-service-group"
    
    # KYC Verification Topics
    kafka_topic_verification: str = "kyc-verification"
    kafka_topic_result: str = "kyc-result"
    
    # Proof Verification Topics
    kafka_topic_proof_verification: str = "proof-verification-request"
    kafka_topic_proof_result: str = "proof-verification-result"
    
    # Gemini API Configuration
    gemini_api_key: str = ""
    enable_gemini_mock: bool = False
    
    # Service Configuration
    log_level: str = "INFO"
    service_name: str = "ai-service"
    service_version: str = "1.0.0"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
