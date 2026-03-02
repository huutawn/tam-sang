"""
Kafka Consumer for AI Service

Manages async message processing within a dedicated event loop per consumer thread.
Supports 3 workflows: KYC verification, Proof verification, Hybrid reasoning.

Architecture:
    - Consumer runs in a separate daemon thread (started by FastAPI lifespan).
    - A single asyncio event loop is created and owned by the consumer thread.
    - All async handlers execute within this loop via `loop.run_until_complete()`,
      avoiding the overhead and concurrency bugs of `asyncio.run()`.
"""

import json
import logging
import asyncio
from datetime import datetime
from typing import Optional

from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError

from app.config import settings
from app.models.events import KycInitiatedEvent, KycAnalyzedEvent
from app.models.proof_events import ProofVerificationRequest, ProofVerificationResult
from app.models.hybrid_events import HybridReasoningRequest
from app.models.face_verification_events import FaceVerificationRequest, FaceVerificationResult
from app.services.ocr_service import ocr_service
from app.kafka.proof_handler import proof_verification_handler
from app.services.hybrid_reasoning import hybrid_reasoning_service
from app.services.image_forensics import image_forensics_service
from app.services.face_verification import face_verification_service
from app.utils.image_utils import download_image

logger = logging.getLogger(__name__)


class KycKafkaConsumer:
    """
    Kafka consumer for AI verification events.

    Handles messages from four topics:
      - KYC verification (OCR-based ID card processing)
      - Proof verification (invoice analysis)
      - Hybrid reasoning (CLIP + Gemini multi-modal analysis)
      - Face verification (selfie vs KYC image for withdrawals)

    Thread-safety:
      This consumer is designed to run in exactly ONE background thread.
      The event loop is created lazily and bound to that thread.
    """

    def __init__(self) -> None:
        self.consumer: Optional[KafkaConsumer] = None
        self.producer: Optional[KafkaProducer] = None
        self.running: bool = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._http_client = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """
        Start the Kafka consumer.

        Creates a dedicated asyncio event loop for this thread, initialises
        the KafkaConsumer and KafkaProducer, then enters the consume loop.

        Raises:
            KafkaError: If connection to Kafka brokers fails.
        """
        try:
            # Create a dedicated event loop for the consumer thread.
            # This loop lives for the entire lifetime of the thread and avoids
            # the per-message overhead of asyncio.run() (which tears down the
            # loop each time, leaking resources and causing potential deadlocks).
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)

            topics = [
                settings.kafka_topic_verification,        # KYC verification
                settings.kafka_topic_proof_verification,  # Proof verification
                settings.kafka_topic_hybrid_reasoning,    # Hybrid reasoning (CLIP + Gemini)
                settings.kafka_topic_face_verification,   # Face verification for withdrawals
            ]
            logger.info("Starting Kafka consumer for topics: %s", topics)

            self.consumer = KafkaConsumer(
                *topics,
                bootstrap_servers=settings.kafka_bootstrap_servers,
                group_id=settings.kafka_group_id,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                auto_offset_reset="earliest",
                enable_auto_commit=True,
            )

            def _json_serializer_default(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                return str(obj)

            self.producer = KafkaProducer(
                bootstrap_servers=settings.kafka_bootstrap_servers,
                value_serializer=lambda v: json.dumps(v, default=_json_serializer_default).encode("utf-8"),
            )

            self.running = True
            logger.info("Kafka consumer started successfully")

            self.consume()

        except Exception as e:
            logger.error("Failed to start Kafka consumer: %s", e, exc_info=True)
            raise
        finally:
            # Ensure the event loop is closed when the consumer exits.
            if self._loop and not self._loop.is_closed():
                self._loop.close()
                logger.debug("Consumer event loop closed")

    def stop(self) -> None:
        """Gracefully stop the Kafka consumer and release resources."""
        logger.info("Stopping Kafka consumer...")
        self.running = False

        if self.consumer:
            try:
                self.consumer.close()
            except Exception as e:
                logger.warning("Error closing Kafka consumer: %s", e)

        if self.producer:
            try:
                self.producer.flush(timeout=5)
                self.producer.close(timeout=5)
            except Exception as e:
                logger.warning("Error closing Kafka producer: %s", e)

        logger.info("Kafka consumer stopped")

    # ------------------------------------------------------------------
    # Message dispatch
    # ------------------------------------------------------------------

    def consume(self) -> None:
        """
        Main consume loop.

        Dispatches messages to the appropriate async handler based on the
        Kafka topic.  Each handler is executed via ``loop.run_until_complete``
        so that async services (httpx, asyncpg, etc.) work correctly without
        creating a new event loop per message.
        """
        logger.info("Starting to consume messages...")

        try:
            for message in self.consumer:
                if not self.running:
                    break

                try:
                    event_data = message.value
                    topic = message.topic

                    logger.info(
                        "Received message from topic: %s, partition: %s, offset: %s",
                        topic,
                        message.partition,
                        message.offset,
                    )

                    # Route to appropriate handler based on topic
                    if topic == settings.kafka_topic_verification:
                        self._dispatch_kyc(event_data)
                    elif topic == settings.kafka_topic_proof_verification:
                        self._dispatch_proof(event_data)
                    elif topic == settings.kafka_topic_hybrid_reasoning:
                        self._dispatch_hybrid(event_data)
                    elif topic == settings.kafka_topic_face_verification:
                        self._dispatch_face_verification(event_data)
                    else:
                        logger.warning("Received message from unknown topic: %s", topic)

                except Exception as e:
                    logger.error("Error processing message: %s", e, exc_info=True)
                    # Continue consuming; do not crash on a single bad message.
                    continue

        except KeyboardInterrupt:
            logger.info("Consumer interrupted by user")
        except AssertionError as e:
            # Closing the consumer from the main thread causes an AssertionError 
            # in the background thread's blocking __next__ call.
            if not self.running:
                logger.info("Kafka consumer loop terminated gracefully during shutdown.")
            else:
                logger.error("Fatal assertion error in consumer loop: %s", e, exc_info=True)
        except Exception as e:
            logger.error("Fatal error in consumer loop: %s", e, exc_info=True)
        finally:
            self.stop()

    # ------------------------------------------------------------------
    # Dispatch helpers
    # ------------------------------------------------------------------

    def _dispatch_kyc(self, event_data: dict) -> None:
        """Parse and process a KYC verification event."""
        kyc_id = event_data.get("kycId", "unknown")
        logger.info("Received KycInitiatedEvent: %s", kyc_id)
        try:
            event = KycInitiatedEvent(**event_data)
            self._loop.run_until_complete(self.process_kyc_event(event))
        except Exception as e:
            logger.error("Failed to dispatch KYC event (kycId=%s): %s", kyc_id, e, exc_info=True)

    def _dispatch_proof(self, event_data: dict) -> None:
        """Parse and process a proof verification event."""
        proof_id = event_data.get("proofId", "unknown")
        logger.info("Received ProofVerificationRequest: %s", proof_id)
        try:
            self._loop.run_until_complete(self.process_proof_event(event_data))
        except Exception as e:
            logger.error("Failed to dispatch proof event (proofId=%s): %s", proof_id, e, exc_info=True)

    def _dispatch_hybrid(self, event_data: dict) -> None:
        """Parse and process a hybrid reasoning event."""
        proof_id = event_data.get("proof_id", "unknown")
        logger.info("Received HybridReasoningRequest: %s", proof_id)
        try:
            self._loop.run_until_complete(self.process_hybrid_reasoning_event(event_data))
        except Exception as e:
            logger.error("Failed to dispatch hybrid event (proof_id=%s): %s", proof_id, e, exc_info=True)

    def _dispatch_face_verification(self, event_data: dict) -> None:
        """Parse and process a face verification event for withdrawal."""
        withdrawal_id = event_data.get("withdrawalId", "unknown")
        logger.info("Received FaceVerificationRequest: %s", withdrawal_id)
        try:
            self._loop.run_until_complete(self.process_face_verification_event(event_data))
        except Exception as e:
            logger.error("Failed to dispatch face verification event (withdrawalId=%s): %s", withdrawal_id, e, exc_info=True)

    # ------------------------------------------------------------------
    # Async handlers
    # ------------------------------------------------------------------

    async def process_kyc_event(self, event: KycInitiatedEvent) -> None:
        """Process KYC verification event via OCR pipeline."""
        try:
            logger.info("Processing KYC for kycId: %s", event.kycId)

            extracted_data = await ocr_service.process_id_card(
                event.frontImageUrl, event.backImageUrl
            )

            # Compute confidence from how many fields were successfully extracted
            confidence = self._compute_ocr_confidence(extracted_data)

            result_event = KycAnalyzedEvent(
                kycId=event.kycId,
                userId=event.userId,
                extractedData=extracted_data,
                confidence=confidence,
                timestamp=datetime.now(),
            )

            self.publish_result(result_event)
            logger.info(
                "Successfully processed KYC for kycId: %s (confidence=%.2f)",
                event.kycId, confidence,
            )

        except Exception as e:
            logger.error(
                "Failed to process KYC event for kycId: %s: %s",
                event.kycId, e, exc_info=True,
            )

    @staticmethod
    def _compute_ocr_confidence(data) -> float:
        """
        Compute OCR confidence based on extracted field completeness.

        Each of the 10 KYC fields contributes 0.1 to the score.
        Required fields (fullName, idNumber) are weighted 2x.
        """
        fields = [
            ("fullName", 2),      # Required — double weight
            ("idNumber", 2),      # Required — double weight
            ("dob", 1),
            ("idType", 1),
            ("address", 1),
            ("gender", 1),
            ("nationality", 1),
            ("placeOfOrigin", 1),
            ("issueDate", 1),
            ("expiryDate", 1),
        ]
        total_weight = sum(w for _, w in fields)
        filled = sum(
            w for field, w in fields
            if getattr(data, field, None)
        )
        return round(filled / total_weight, 2)

    async def process_proof_event(self, event_data: dict) -> None:
        """Process proof verification event (invoice or selfie)."""
        proof_id = event_data.get("proofId", "unknown")
        try:
            logger.info("Processing proof verification for proofId: %s", proof_id)

            request = ProofVerificationRequest(**event_data)
            result = await proof_verification_handler.process_proof_verification(request)
            self.publish_proof_result(result)

            logger.info(
                "Successfully processed proof verification for proofId: %s", result.proofId
            )

        except Exception as e:
            logger.error(
                "Failed to process proof verification event (proofId=%s): %s",
                proof_id, e, exc_info=True,
            )

    async def process_hybrid_reasoning_event(self, event_data: dict) -> None:
        """
        Process hybrid reasoning event (CLIP + Gemini).

        This handler combines:
          - CLIP (Local AI): Scene image relevance & deduplication
          - Gemini (Remote AI): Bill analysis & price validation

        Results are sent via HTTP callback to Core-service.
        """
        proof_id = event_data.get("proof_id", "unknown")
        try:
            logger.info("Processing hybrid reasoning for proof_id: %s", proof_id)

            request = HybridReasoningRequest(**event_data)
            result = await hybrid_reasoning_service.process(request)

            logger.info(
                "Hybrid reasoning complete for proof_id: %s, trust_score: %s, is_valid: %s",
                proof_id, result.trust_score, result.is_valid,
            )

        except Exception as e:
            logger.error(
                "Failed to process hybrid reasoning event for proof_id %s: %s",
                proof_id, e, exc_info=True,
            )

    async def process_face_verification_event(self, event_data: dict) -> None:
        """
        Process face verification event for withdrawals.

        Flow:
          1. Download selfie image
          2. Resolve KYC image URL (via identity-service or from event)
          3. Run Image Forensics on selfie
          4. Run Face Verification (selfie vs KYC image)
          5. Send HTTP callback to Core-service with results
        """
        withdrawal_id = event_data.get("withdrawalId", "unknown")
        try:
            logger.info("Processing face verification for withdrawal: %s", withdrawal_id)

            request = FaceVerificationRequest(**event_data)

            # 1. Download selfie image
            selfie_bytes = await download_image(request.selfieImageUrl)

            # 2. Resolve KYC image
            kyc_image_url = request.kycImageUrl
            if not kyc_image_url:
                # Try to get KYC image from identity-service via API gateway
                kyc_image_url = await self._resolve_kyc_image_url(request.userId)

            if not kyc_image_url:
                logger.error("Cannot resolve KYC image URL for user: %s", request.userId)
                await self._send_face_verification_callback(
                    withdrawal_id, False, 0, "FAILED",
                    "Không tìm được ảnh KYC để đối chiếu khuôn mặt"
                )
                return

            kyc_bytes = await download_image(kyc_image_url)

            # 3. Image Forensics on selfie
            forensics_result = image_forensics_service.analyze(selfie_bytes)
            forensics_score = 0 if forensics_result["has_warning"] else 100

            # 4. Face Verification
            face_result = await face_verification_service.verify_face(
                selfie_bytes, kyc_bytes
            )
            face_score = face_result["score"]

            # 5. Calculate final score (20% forensics + 80% face)
            final_score = int(forensics_score * 0.2 + face_score * 0.8)

            # Determine status
            has_software_warning = (
                forensics_result["has_warning"] and forensics_result.get("software_detected")
            )

            if face_result["verified"] and not has_software_warning:
                if final_score >= 80:
                    status = "VERIFIED"
                else:
                    status = "WARNING"
            else:
                if has_software_warning:
                    status = "FAILED"
                elif not face_result["verified"]:
                    status = "FAILED"
                else:
                    status = "WARNING"

            verified = status == "VERIFIED"

            # Build analysis log
            analysis_log = (
                f"**Xác thực Khuôn mặt:**\n{face_result.get('details', 'N/A')}\n\n"
                f"**Kiểm tra Forensics:**\n"
                f"- EXIF: {forensics_result.get('details', 'N/A')}\n"
                f"- Software: {forensics_result.get('software_detected') or 'Không phát hiện'}\n\n"
                f"**Điểm số:**\n"
                f"- Forensics: {forensics_score}/100\n"
                f"- Face Verification: {face_score}/100\n"
                f"- Tổng điểm: {final_score}/100"
            )

            # 6. Send callback
            await self._send_face_verification_callback(
                withdrawal_id, verified, final_score, status, analysis_log
            )

            logger.info(
                "Face verification complete for withdrawal %s: score=%d, status=%s",
                withdrawal_id, final_score, status
            )

        except Exception as e:
            logger.error(
                "Failed to process face verification for withdrawal %s: %s",
                withdrawal_id, e, exc_info=True,
            )
            # Send error callback
            try:
                await self._send_face_verification_callback(
                    withdrawal_id, False, 0, "FAILED",
                    f"Lỗi hệ thống khi xác thực khuôn mặt: {str(e)}"
                )
            except Exception as cb_err:
                logger.error("Failed to send error callback: %s", cb_err)

    async def _resolve_kyc_image_url(self, user_id: str) -> Optional[str]:
        """Resolve KYC front image URL from identity-service."""
        import httpx
        try:
            url = f"{settings.core_service_url}/identity-service/kyc/user/{user_id}"
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("result", {}).get("frontImageUrl")
        except Exception as e:
            logger.error("Failed to resolve KYC image for user %s: %s", user_id, e)
        return None

    async def _send_face_verification_callback(
        self, withdrawal_id: str, verified: bool, score: int, status: str, analysis_log: str
    ) -> bool:
        """Send face verification result to Core-service via HTTP callback."""
        import httpx
        callback_url = f"{settings.core_service_url}/core-service{settings.face_verification_callback_endpoint}"
        
        payload = FaceVerificationResult(
            withdrawal_id=withdrawal_id,
            verified=verified,
            score=score,
            status=status,
            analysis_log=analysis_log
        )

        logger.info("Sending face verification callback to %s for withdrawal %s", callback_url, withdrawal_id)

        for attempt in range(settings.callback_retry_count):
            try:
                async with httpx.AsyncClient(timeout=settings.callback_timeout) as client:
                    resp = await client.post(
                        callback_url,
                        json=payload.model_dump(mode="json"),
                        headers={"Content-Type": "application/json"}
                    )
                    if resp.status_code in (200, 201, 202):
                        logger.info("Face verification callback successful for withdrawal %s", withdrawal_id)
                        return True
                    else:
                        logger.warning(
                            "Callback attempt %d failed: status=%d, body=%s",
                            attempt + 1, resp.status_code, resp.text
                        )
            except Exception as e:
                logger.error("Callback request failed (attempt %d): %s", attempt + 1, e)

            if attempt < settings.callback_retry_count - 1:
                await asyncio.sleep(2 ** attempt)

        logger.error("All face verification callback attempts failed for withdrawal %s", withdrawal_id)
        return False

    # ------------------------------------------------------------------
    # Kafka publishing
    # ------------------------------------------------------------------

    def publish_result(self, event: KycAnalyzedEvent) -> None:
        """Publish KYC analysis result to Kafka."""
        try:
            logger.info("Publishing KycAnalyzedEvent for kycId: %s", event.kycId)

            event_dict = event.model_dump()
            future = self.producer.send(
                settings.kafka_topic_result,
                value=event_dict,
                key=event.kycId.encode("utf-8"),
            )
            record_metadata = future.get(timeout=10)

            logger.info(
                "Published KycAnalyzedEvent for kycId: %s to topic: %s, partition: %s",
                event.kycId, record_metadata.topic, record_metadata.partition,
            )

        except KafkaError as e:
            logger.error(
                "Failed to publish KycAnalyzedEvent for kycId: %s: %s",
                event.kycId, e,
            )
            raise

    def publish_proof_result(self, event: ProofVerificationResult) -> None:
        """Publish proof verification result to Kafka."""
        try:
            logger.info("Publishing ProofVerificationResult for proofId: %s", event.proofId)

            event_dict = event.model_dump()
            future = self.producer.send(
                settings.kafka_topic_proof_result,
                value=event_dict,
                key=event.proofId.encode("utf-8"),
            )
            record_metadata = future.get(timeout=10)

            logger.info(
                "Published ProofVerificationResult for proofId: %s to topic: %s, partition: %s",
                event.proofId, record_metadata.topic, record_metadata.partition,
            )

        except KafkaError as e:
            logger.error(
                "Failed to publish ProofVerificationResult for proofId: %s: %s",
                event.proofId, e,
            )
            raise


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
kafka_consumer = KycKafkaConsumer()
