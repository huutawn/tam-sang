"""
Unified hybrid proof reasoning service.

Day 1 refactor goals:
- keep a single proof-verification flow
- centralize the scoring rubric
- preserve the existing callback contract to Core-service
"""

import asyncio
from datetime import datetime
import logging
from typing import List, Optional, Tuple
from uuid import UUID

import httpx

from app.config import settings
from app.models.hybrid_events import (
    BillItem,
    CallbackPayload,
    ClipAnalysisResult,
    DuplicateCheckResult,
    GeminiAnalysisResult,
    HybridReasoningRequest,
    HybridReasoningResponse,
    ImageRelevanceResult,
)
from app.services.clip_service import clip_service
from app.services.bill_validator import validate_bill_result
from app.services.llm_reasoning import llm_reasoning_service
from app.services.proof_rubric import assess_proof
from app.services.vector_db import vector_db_service
from app.utils.image_utils import download_image

logger = logging.getLogger(__name__)


class HybridReasoningService:
    """
    Hybrid Embedding & Cross-modal Retrieval Service.

    The service keeps one source of truth for proof AI:
      1. scene images -> relevance + duplicate check
      2. bill images -> item extraction + trust score
      3. rubric -> final score + decision
      4. callback -> persisted by Core-service
    """

    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None
        logger.info("HybridReasoningService initialized")

    async def _get_http_client(self) -> httpx.AsyncClient:
        if self.http_client is None:
            self.http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.callback_timeout),
                follow_redirects=True,
            )
        return self.http_client

    async def close(self):
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None

    async def _analyze_scene_images(
        self,
        image_urls: List[str],
        withdrawal_reason: str,
        campaign_id: str,
    ) -> ClipAnalysisResult:
        logger.info("Analyzing %s scene images", len(image_urls))

        image_results: List[ImageRelevanceResult] = []
        duplicate_details: List[DuplicateCheckResult] = []
        total_similarity = 0.0
        has_duplicate = False

        for i, url in enumerate(image_urls):
            try:
                logger.info("[Scene %s/%s] Downloading image", i + 1, len(image_urls))
                image_bytes = await download_image(url)

                similarity, is_relevant, reasoning = clip_service.check_text_image_relevance(
                    image_bytes,
                    withdrawal_reason,
                )

                image_results.append(
                    ImageRelevanceResult(
                        image_index=i,
                        image_url=url,
                        similarity=similarity,
                        is_relevant=is_relevant,
                        reasoning=reasoning,
                    )
                )
                total_similarity += similarity

                embedding = clip_service.compute_image_embedding(image_bytes)
                is_dup, matching_url = await vector_db_service.check_duplicate(embedding)
                if is_dup:
                    has_duplicate = True
                    duplicate_details.append(
                        DuplicateCheckResult(
                            is_duplicate=True,
                            matching_url=matching_url,
                            similarity=0.98,
                        )
                    )
                else:
                    try:
                        await vector_db_service.store_embedding(
                            campaign_id=UUID(campaign_id),
                            image_url=url,
                            embedding=embedding,
                        )
                    except ValueError:
                        logger.warning("Invalid campaign_id format: %s", campaign_id)

            except Exception as e:
                logger.error("Failed to analyze scene image %s (%s): %s", i, url, e)
                image_results.append(
                    ImageRelevanceResult(
                        image_index=i,
                        image_url=url,
                        similarity=0.0,
                        is_relevant=False,
                        reasoning=f"Loi phan tich: {str(e)}",
                    )
                )

        avg_score = total_similarity / len(image_urls) if image_urls else 0.0
        return ClipAnalysisResult(
            scene_relevance_score=avg_score,
            image_results=image_results,
            duplicate_detected=has_duplicate,
            duplicate_details=duplicate_details,
        )

    async def _analyze_bill_images(
        self,
        image_urls: List[str],
        withdrawal_reason: str,
        campaign_goal: str,
    ) -> GeminiAnalysisResult:
        logger.info("Analyzing %s bill images", len(image_urls))

        all_items: List[BillItem] = []
        total_amount = 0.0
        price_warnings: List[str] = []
        validation_warnings: List[str] = []
        all_valid = True
        all_reasoning: List[str] = []
        total_score = 0

        for i, url in enumerate(image_urls):
            try:
                logger.info("[Bill %s/%s] Downloading image", i + 1, len(image_urls))
                image_bytes = await download_image(url)
                result = await llm_reasoning_service.analyze_invoice_detailed(
                    image_bytes=image_bytes,
                    withdrawal_reason=withdrawal_reason,
                    campaign_goal=campaign_goal,
                )

                validation = validate_bill_result(result)

                for item_data in validation.normalized_items:
                    all_items.append(
                        BillItem(
                            name=item_data.get("name", "Unknown"),
                            quantity=float(item_data.get("quantity", 1)),
                            unit_price=float(item_data.get("unit_price", 0)),
                            total_price=float(item_data.get("total_price", 0)),
                            is_reasonable=item_data.get("is_reasonable", True),
                        )
                    )

                total_amount += result.get("total_amount", 0)
                price_warnings.extend(result.get("price_warnings", []))
                validation_warnings.extend(validation.validation_warnings)

                if not result.get("serves_campaign_goal", True):
                    all_valid = False
                if not validation.is_structurally_valid:
                    all_valid = False

                all_reasoning.append(
                    f"Hoa don {i + 1}: {result.get('reasoning', 'Khong co phan tich')}"
                )
                if validation.validation_warnings:
                    all_reasoning.append(
                        f"Hoa don {i + 1} - validator: {' | '.join(validation.validation_warnings)}"
                    )
                total_score += validation.adjusted_trust_score

            except Exception as e:
                logger.error("Failed to analyze bill image %s (%s): %s", i, url, e)
                all_reasoning.append(f"Hoa don {i + 1}: Loi phan tich - {str(e)}")
                total_score += 0

        avg_score = total_score // len(image_urls) if image_urls else 0
        return GeminiAnalysisResult(
            total_amount=total_amount,
            items=all_items,
            price_warnings=price_warnings,
            validation_warnings=validation_warnings,
            serves_campaign_goal=all_valid,
            reasoning="\n".join(all_reasoning),
            trust_score=avg_score,
        )

    def _compute_final_score(
        self,
        clip_result: ClipAnalysisResult,
        gemini_result: GeminiAnalysisResult,
    ) -> Tuple[int, bool, str, str, str]:
        clip_score = int(clip_result.scene_relevance_score * 100)
        bill_score = gemini_result.trust_score

        breakdown = assess_proof(
            bill_score=bill_score,
            scene_score=clip_score,
            duplicate_detected=clip_result.duplicate_detected,
            bill_warning_count=len(gemini_result.price_warnings) + len(gemini_result.validation_warnings),
            serves_campaign_goal=gemini_result.serves_campaign_goal,
        )

        summary_parts = [
            f"[Rubric] {breakdown.rubric_version}",
            f"[Decision] {breakdown.decision}",
            f"Hoa don: tong {gemini_result.total_amount:,.0f}d, {len(gemini_result.items)} muc",
            f"Scene score: {breakdown.scene_score}",
            f"Bill score: {breakdown.bill_score}",
        ]

        if clip_result.duplicate_detected:
            summary_parts.append("CANH BAO: Phat hien anh trung lap")

        if gemini_result.price_warnings:
            summary_parts.append(
                f"CANH BAO: {len(gemini_result.price_warnings)} don gia bat thuong"
            )

        if gemini_result.validation_warnings:
            summary_parts.append(
                f"CANH BAO: {len(gemini_result.validation_warnings)} canh bao validator bill"
            )

        if gemini_result.serves_campaign_goal:
            summary_parts.append("Phu hop muc tieu chien dich")
        else:
            summary_parts.append("Khong phu hop muc tieu chien dich")

        summary_parts.append(
            f"[Breakdown] bonus={breakdown.clean_bonus}, "
            f"duplicate_penalty={breakdown.duplicate_penalty}, "
            f"price_penalty={breakdown.price_penalty}"
        )
        summary_parts.append(f"Diem tin cay: {breakdown.final_score}/100")

        return (
            breakdown.final_score,
            breakdown.decision == "VERIFIED",
            " | ".join(summary_parts),
            breakdown.decision,
            breakdown.rubric_version,
        )

    async def _send_callback(self, response: HybridReasoningResponse) -> bool:
        callback_url = f"{settings.core_service_url}{settings.callback_endpoint}"
        payload = CallbackPayload.from_response(response)

        logger.info("Sending callback to %s for proof %s", callback_url, response.proof_id)

        for attempt in range(settings.callback_retry_count):
            try:
                client = await self._get_http_client()
                http_response = await client.post(
                    callback_url,
                    json=payload.model_dump(mode="json"),
                    headers={"Content-Type": "application/json"},
                )

                if http_response.status_code in (200, 201, 202):
                    logger.info("Callback successful for proof %s", response.proof_id)
                    return True

                logger.warning(
                    "Callback attempt %s failed: status=%s body=%s",
                    attempt + 1,
                    http_response.status_code,
                    http_response.text,
                )
            except httpx.RequestError as e:
                logger.error("Callback request failed (attempt %s): %s", attempt + 1, e)

            if attempt < settings.callback_retry_count - 1:
                await asyncio.sleep(2 ** attempt)

        logger.error("All callback attempts failed for proof %s", response.proof_id)
        return False

    async def process(self, request: HybridReasoningRequest) -> HybridReasoningResponse:
        logger.info("Starting hybrid reasoning for proof %s", request.proof_id)
        start_time = datetime.now()

        try:
            await vector_db_service.initialize()

            clip_task = self._analyze_scene_images(
                image_urls=request.list_image_url,
                withdrawal_reason=request.withdrawal_reason,
                campaign_id=request.campaign_id,
            )
            bill_task = self._analyze_bill_images(
                image_urls=request.list_bill_image_url,
                withdrawal_reason=request.withdrawal_reason,
                campaign_goal=request.campaign_goal,
            )

            clip_result, gemini_result = await asyncio.gather(
                clip_task,
                bill_task,
                return_exceptions=True,
            )

            if isinstance(clip_result, Exception):
                logger.error("Scene analysis failed: %s", clip_result)
                clip_result = ClipAnalysisResult()

            if isinstance(gemini_result, Exception):
                logger.error("Bill analysis failed: %s", gemini_result)
                gemini_result = GeminiAnalysisResult()

            trust_score, is_valid, summary, decision, rubric_version = self._compute_final_score(
                clip_result,
                gemini_result,
            )

            response = HybridReasoningResponse(
                proof_id=request.proof_id,
                trust_score=trust_score,
                is_valid=is_valid,
                decision=decision,
                rubric_version=rubric_version,
                clip_analysis=clip_result,
                gemini_analysis=gemini_result,
                analysis_summary=summary,
            )

            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(
                "Hybrid reasoning complete for proof %s: score=%s valid=%s decision=%s elapsed=%.2fs",
                request.proof_id,
                trust_score,
                is_valid,
                decision,
                elapsed,
            )

            callback_success = await self._send_callback(response)
            if not callback_success:
                logger.warning("Callback failed for proof %s", request.proof_id)

            return response

        except Exception as e:
            logger.error("Hybrid reasoning failed for proof %s: %s", request.proof_id, e, exc_info=True)

            error_response = HybridReasoningResponse(
                proof_id=request.proof_id,
                trust_score=0,
                is_valid=False,
                decision="SUSPICIOUS",
                rubric_version="day1-v1",
                analysis_summary=f"Loi xu ly: {str(e)}",
            )

            try:
                await self._send_callback(error_response)
            except Exception as cb_err:
                logger.error(
                    "Failed to send error callback for proof %s: %s",
                    request.proof_id,
                    cb_err,
                )

            return error_response


hybrid_reasoning_service = HybridReasoningService()
