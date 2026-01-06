import json
import logging
import asyncio
from datetime import datetime
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError

from app.config import settings
from app.models.events import KycInitiatedEvent, KycAnalyzedEvent
from app.models.proof_events import ProofVerificationRequest, ProofVerificationResult
from app.services.ocr_service import ocr_service
from app.kafka.proof_handler import proof_verification_handler

logger = logging.getLogger(__name__)


class KycKafkaConsumer:
    """Kafka consumer for KYC verification events"""

    def __init__(self):
        self.consumer = None
        self.producer = None
        self.running = False

    def start(self):
        """Start Kafka consumer"""
        try:
            # Subscribe to multiple topics
            topics = [
                settings.kafka_topic_verification,  # KYC verification
                settings.kafka_topic_proof_verification  # Proof verification
            ]
            logger.info(f"Starting Kafka consumer for topics: {topics}")

            # Initialize consumer
            self.consumer = KafkaConsumer(
                *topics,  # Subscribe to multiple topics
                bootstrap_servers=settings.kafka_bootstrap_servers,
                group_id=settings.kafka_group_id,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                auto_offset_reset="earliest",
                enable_auto_commit=True,
            )

            # Initialize producer for results
            self.producer = KafkaProducer(
                bootstrap_servers=settings.kafka_bootstrap_servers,
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            )

            self.running = True
            logger.info("Kafka consumer started successfully")

            # Start consuming
            self.consume()

        except Exception as e:
            logger.error(f"Failed to start Kafka consumer: {e}")
            raise

    def consume(self):
        """Consume messages from Kafka"""
        logger.info("Starting to consume messages...")

        try:
            for message in self.consumer:
                if not self.running:
                    break

                try:
                    # Parse event
                    event_data = message.value
                    topic = message.topic
                    
                    logger.info(f"Received message from topic: {topic}")
                    
                    # Route to appropriate handler based on topic
                    if topic == settings.kafka_topic_verification:
                        # KYC verification workflow (existing)
                        logger.info(f"Received KycInitiatedEvent: {event_data.get('kycId')}")
                        event = KycInitiatedEvent(**event_data)
                        asyncio.run(self.process_kyc_event(event))
                        
                    elif topic == settings.kafka_topic_proof_verification:
                        # Proof verification workflow (new)
                        logger.info(f"Received ProofVerificationRequest: {event_data.get('proofId')}")
                        asyncio.run(self.process_proof_event(event_data))
                    else:
                        logger.warning(f"Unknown topic: {topic}")

                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)
                    continue

        except KeyboardInterrupt:
            logger.info("Consumer interrupted by user")
        except Exception as e:
            logger.error(f"Error in consumer loop: {e}", exc_info=True)
        finally:
            self.stop()

    async def process_kyc_event(self, event: KycInitiatedEvent):
        """Process KYC verification event"""
        try:
            logger.info(f"Processing KYC for kycId: {event.kycId}")

            # Perform OCR on ID card images
            extracted_data = await ocr_service.process_id_card(
                event.frontImageUrl, event.backImageUrl
            )

            # Create result event
            result_event = KycAnalyzedEvent(
                kycId=event.kycId,
                userId=event.userId,
                extractedData=extracted_data,
                confidence=0.95,  # Mock confidence score
                timestamp=datetime.now(),
            )

            # Publish result to Kafka
            self.publish_result(result_event)

            logger.info(f"Successfully processed KYC for kycId: {event.kycId}")

        except Exception as e:
            logger.error(f"Failed to process KYC event for kycId: {event.kycId}: {e}", exc_info=True)

    def publish_result(self, event: KycAnalyzedEvent):
        """Publish KYC analysis result to Kafka"""
        try:
            logger.info(f"Publishing KycAnalyzedEvent for kycId: {event.kycId}")

            # Convert to dict
            event_dict = event.model_dump()

            # Send to Kafka
            future = self.producer.send(settings.kafka_topic_result, value=event_dict, key=event.kycId.encode("utf-8"))

            # Wait for send to complete
            record_metadata = future.get(timeout=10)

            logger.info(
                f"Successfully published KycAnalyzedEvent for kycId: {event.kycId} "
                f"to topic: {record_metadata.topic}, partition: {record_metadata.partition}"
            )

        except KafkaError as e:
            logger.error(f"Failed to publish KycAnalyzedEvent for kycId: {event.kycId}: {e}")
            raise
    
    async def process_proof_event(self, event_data: dict):
        """Process proof verification event"""
        try:
            logger.info(f"Processing proof verification for proofId: {event_data.get('proofId')}")
            
            # Parse request
            request = ProofVerificationRequest(**event_data)
            
            # Process verification
            result = await proof_verification_handler.process_proof_verification(request)
            
            # Publish result
            self.publish_proof_result(result)
            
            logger.info(f"Successfully processed proof verification for proofId: {result.proofId}")
            
        except Exception as e:
            logger.error(f"Failed to process proof verification event: {e}", exc_info=True)
    
    def publish_proof_result(self, event: ProofVerificationResult):
        """Publish proof verification result to Kafka"""
        try:
            logger.info(f"Publishing ProofVerificationResult for proofId: {event.proofId}")
            
            # Convert to dict
            event_dict = event.model_dump()
            
            # Send to Kafka
            future = self.producer.send(
                settings.kafka_topic_proof_result, 
                value=event_dict, 
                key=event.proofId.encode("utf-8")
            )
            
            # Wait for send to complete
            record_metadata = future.get(timeout=10)
            
            logger.info(
                f"Successfully published ProofVerificationResult for proofId: {event.proofId} "
                f"to topic: {record_metadata.topic}, partition: {record_metadata.partition}"
            )
            
        except KafkaError as e:
            logger.error(f"Failed to publish ProofVerificationResult for proofId: {event.proofId}: {e}")
            raise

    def stop(self):
        """Stop Kafka consumer"""
        logger.info("Stopping Kafka consumer...")
        self.running = False

        if self.consumer:
            self.consumer.close()

        if self.producer:
            self.producer.flush()
            self.producer.close()

        logger.info("Kafka consumer stopped")


kafka_consumer = KycKafkaConsumer()
