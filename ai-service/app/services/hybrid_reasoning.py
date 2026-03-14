"""
Unified hybrid proof reasoning service.

Day 3 focus:
- keep one proof-verification flow
- reduce dependence on raw CLIP similarity
- add stronger anti-reuse and soft-signal forensics
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
from app.services.bill_validator import validate_bill_result
from app.services.clip_service import clip_service
from app.services.image_forensics import image_forensics_service
from app.services.llm_reasoning import llm_reasoning_service
from app.services.proof_rubric import assess_proof
from app.services.vector_db import DuplicateLookupResult, vector_db_service
from app.utils.callback_utils import build_callback_urls
from app.utils.image_utils import download_image

logger = logging.getLogger(__name__)


class HybridReasoningService:
    """
    Hybrid proof analysis service.

    Source of truth:
      1. scene images -> relevance + forensic evidence + duplicate lookup
      2. bill images -> structured extraction + validator
      3. rubric -> final trust score and decision
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

    def _duplicate_risk_rank(self, risk_level: str) -> int:
        return {
            "none": 0,
            "low": 1,
            "unknown": 1,
            "medium": 2,
            "high": 3,
        }.get((risk_level or "none").lower(), 0)

    def _build_local_duplicate_result(
        self,
        perceptual_hash: str,
        seen_hashes: List[Tuple[str, str]],
    ) -> DuplicateCheckResult:
        if not perceptual_hash:
            return DuplicateCheckResult(is_duplicate=False)

        best_match = DuplicateCheckResult(is_duplicate=False)
        best_rank = 0
        for seen_url, seen_hash in seen_hashes:
            comparison = image_forensics_service.compare_hashes(perceptual_hash, seen_hash)
            similarity = comparison["average_similarity"]
            if comparison["is_exact"]:
                return DuplicateCheckResult(
                    is_duplicate=True,
                    match_type="local_exact_hash",
                    risk_level="high",
                    matching_url=seen_url,
                    similarity=1.0,
                    perceptual_similarity=1.0,
                    notes="Anh trong cung proof submission bi trung hash chinh xac.",
                )
            if comparison["is_near_duplicate"] and similarity >= 0.92:
                candidate = DuplicateCheckResult(
                    is_duplicate=True,
                    match_type="local_near_hash",
                    risk_level="medium",
                    matching_url=seen_url,
                    similarity=similarity,
                    perceptual_similarity=similarity,
                    notes=f"Anh trong cung proof submission rat giong nhau ({similarity:.2%}).",
                )
                rank = self._duplicate_risk_rank(candidate.risk_level)
                if rank > best_rank or (
                    rank == best_rank and (candidate.similarity or 0.0) > (best_match.similarity or 0.0)
                ):
                    best_match = candidate
                    best_rank = rank

        return best_match

    async def _lookup_global_duplicate(
        self,
        embedding: List[float],
        perceptual_hash: str,
        enabled: bool,
    ) -> DuplicateCheckResult:
        if not enabled:
            return DuplicateCheckResult(
                is_duplicate=False,
                match_type="global_lookup_skipped",
                risk_level="none",
                notes="",
            )

        try:
            result: DuplicateLookupResult = await vector_db_service.check_duplicate(
                embedding,
                perceptual_hash=perceptual_hash or None,
            )
            return DuplicateCheckResult(
                is_duplicate=result.is_duplicate,
                match_type=result.match_type,
                risk_level=result.risk_level,
                matching_url=result.matching_url,
                similarity=result.similarity,
                perceptual_similarity=result.perceptual_similarity,
                notes=result.notes,
            )
        except Exception as exc:
            logger.warning("Global duplicate lookup failed: %s", exc)
            return DuplicateCheckResult(
                is_duplicate=False,
                match_type="lookup_error",
                risk_level="unknown",
                notes=f"Loi duplicate lookup: {exc}",
            )

    def _compute_scene_support_score(
        self,
        *,
        similarity: float,
        authenticity_score: int,
        duplicate_risk_level: str,
    ) -> int:
        clip_score = max(0, min(100, int(round(similarity * 100))))
        combined_score = int(round(clip_score * 0.55 + authenticity_score * 0.45))

        risk_level = (duplicate_risk_level or "none").lower()
        if risk_level == "high":
            combined_score = min(combined_score, 20)
        elif risk_level == "medium":
            combined_score = min(combined_score, 45)
        elif risk_level in {"low", "unknown"}:
            combined_score = min(combined_score, 60)

        return max(0, min(100, combined_score))

    async def _analyze_scene_images(
        self,
        image_urls: List[str],
        withdrawal_reason: str,
        campaign_id: str,
        vector_db_enabled: bool,
    ) -> ClipAnalysisResult:
        logger.info("Analyzing %s scene images", len(image_urls))

        image_results: List[ImageRelevanceResult] = []
        duplicate_details: List[DuplicateCheckResult] = []
        forensic_warnings: List[str] = []
        local_hash_registry: List[Tuple[str, str]] = []
        total_similarity = 0.0
        total_support_score = 0
        total_forensic_score = 0
        has_duplicate = False

        for index, url in enumerate(image_urls):
            image_label = f"Anh {index + 1}"
            try:
                logger.info("[Scene %s/%s] Downloading image", index + 1, len(image_urls))
                image_bytes = await download_image(url)

                similarity, is_relevant, relevance_reasoning = clip_service.check_text_image_relevance(
                    image_bytes,
                    withdrawal_reason,
                )
                forensic_result = image_forensics_service.analyze(image_bytes)
                authenticity_score = int(forensic_result.get("authenticity_score", 70))
                perceptual_hash = forensic_result.get("perceptual_hash", "")

                metadata_warnings = forensic_result.get("warnings", [])
                forensic_warnings.extend([f"{image_label}: {warning}" for warning in metadata_warnings])

                embedding = clip_service.compute_image_embedding(image_bytes)

                local_duplicate = self._build_local_duplicate_result(
                    perceptual_hash=perceptual_hash,
                    seen_hashes=local_hash_registry,
                )
                duplicate_result = local_duplicate
                if not duplicate_result.is_duplicate:
                    duplicate_result = await self._lookup_global_duplicate(
                        embedding=embedding,
                        perceptual_hash=perceptual_hash,
                        enabled=vector_db_enabled,
                    )

                if duplicate_result.is_duplicate:
                    has_duplicate = True
                    duplicate_details.append(duplicate_result)
                else:
                    if perceptual_hash:
                        local_hash_registry.append((url, perceptual_hash))
                    if vector_db_enabled:
                        try:
                            await vector_db_service.store_embedding(
                                campaign_id=UUID(campaign_id),
                                image_url=url,
                                embedding=embedding,
                                perceptual_hash=perceptual_hash or None,
                            )
                        except ValueError:
                            logger.warning("Invalid campaign_id format: %s", campaign_id)
                        except Exception as exc:
                            logger.warning("Unable to store embedding for %s: %s", url, exc)

                scene_support_score = self._compute_scene_support_score(
                    similarity=similarity,
                    authenticity_score=authenticity_score,
                    duplicate_risk_level=duplicate_result.risk_level if duplicate_result.is_duplicate else "none",
                )

                reasoning_parts = [
                    relevance_reasoning,
                    f"Forensic score {authenticity_score}/100",
                    f"Scene support {scene_support_score}/100",
                ]
                if metadata_warnings:
                    reasoning_parts.append("Metadata: " + " | ".join(metadata_warnings))
                if duplicate_result.notes:
                    reasoning_parts.append(
                        f"Duplicate check ({duplicate_result.match_type}): {duplicate_result.notes}"
                    )

                image_results.append(
                    ImageRelevanceResult(
                        image_index=index,
                        image_url=url,
                        similarity=similarity,
                        is_relevant=is_relevant,
                        reasoning=" | ".join(reasoning_parts),
                        authenticity_score=authenticity_score,
                    )
                )

                total_similarity += similarity
                total_support_score += scene_support_score
                total_forensic_score += authenticity_score
            except Exception as exc:
                logger.error("Failed to analyze scene image %s (%s): %s", index, url, exc)
                forensic_warnings.append(f"{image_label}: Loi phan tich scene - {exc}")
                image_results.append(
                    ImageRelevanceResult(
                        image_index=index,
                        image_url=url,
                        similarity=0.0,
                        is_relevant=False,
                        reasoning=f"Loi phan tich scene: {exc}",
                        authenticity_score=50,
                    )
                )

        image_count = len(image_urls) or 1
        avg_relevance = total_similarity / image_count if image_urls else 0.0
        avg_support = (total_support_score / image_count) / 100 if image_urls else 0.0
        avg_forensic_score = int(round(total_forensic_score / image_count)) if image_urls else 0

        return ClipAnalysisResult(
            scene_relevance_score=avg_relevance,
            scene_support_score=avg_support,
            forensic_score=avg_forensic_score,
            image_results=image_results,
            forensic_warnings=forensic_warnings,
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

        for index, url in enumerate(image_urls):
            try:
                logger.info("[Bill %s/%s] Downloading image", index + 1, len(image_urls))
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
                    f"Hoa don {index + 1}: {result.get('reasoning', 'Khong co phan tich')}"
                )
                if validation.validation_warnings:
                    all_reasoning.append(
                        f"Hoa don {index + 1} - validator: {' | '.join(validation.validation_warnings)}"
                    )
                total_score += validation.adjusted_trust_score
            except Exception as exc:
                logger.error("Failed to analyze bill image %s (%s): %s", index, url, exc)
                all_reasoning.append(f"Hoa don {index + 1}: Loi phan tich - {exc}")

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

    def _resolve_duplicate_risk_level(self, duplicate_details: List[DuplicateCheckResult]) -> str:
        highest = "none"
        for detail in duplicate_details:
            if self._duplicate_risk_rank(detail.risk_level) > self._duplicate_risk_rank(highest):
                highest = detail.risk_level
        return highest

    def _compute_final_score(
        self,
        clip_result: ClipAnalysisResult,
        gemini_result: GeminiAnalysisResult,
    ) -> Tuple[int, bool, str, str, str]:
        scene_score = int(round(clip_result.scene_support_score * 100))
        duplicate_risk_level = self._resolve_duplicate_risk_level(clip_result.duplicate_details)

        breakdown = assess_proof(
            bill_score=gemini_result.trust_score,
            scene_score=scene_score,
            duplicate_risk_level=duplicate_risk_level,
            bill_warning_count=len(gemini_result.price_warnings) + len(gemini_result.validation_warnings),
            forensic_warning_count=len(clip_result.forensic_warnings),
            serves_campaign_goal=gemini_result.serves_campaign_goal,
        )

        summary_parts = [
            f"[Rubric] {breakdown.rubric_version}",
            f"[Decision] {breakdown.decision}",
            f"Hoa don: tong {gemini_result.total_amount:,.0f}d, {len(gemini_result.items)} muc",
            f"Scene relevance: {clip_result.scene_relevance_score:.2f}",
            f"Forensic score: {clip_result.forensic_score}/100",
            f"Scene support: {scene_score}/100",
            f"Bill score: {breakdown.bill_score}/100",
        ]

        if duplicate_risk_level != "none":
            duplicate_types = ", ".join(
                detail.match_type for detail in clip_result.duplicate_details if detail.match_type
            )
            summary_parts.append(
                f"CANH BAO: Duplicate risk {duplicate_risk_level} ({duplicate_types or 'unknown'})"
            )

        if gemini_result.price_warnings:
            summary_parts.append(
                f"CANH BAO: {len(gemini_result.price_warnings)} don gia bat thuong"
            )

        if gemini_result.validation_warnings:
            summary_parts.append(
                f"CANH BAO: {len(gemini_result.validation_warnings)} canh bao validator bill"
            )

        if clip_result.forensic_warnings:
            summary_parts.append(
                f"CANH BAO: {len(clip_result.forensic_warnings)} canh bao forensic scene"
            )

        if gemini_result.serves_campaign_goal:
            summary_parts.append("Phu hop muc tieu chien dich")
        else:
            summary_parts.append("Khong phu hop muc tieu chien dich")

        summary_parts.append(
            f"[Breakdown] bonus={breakdown.clean_bonus}, "
            f"duplicate_penalty={breakdown.duplicate_penalty}, "
            f"bill_warning_penalty={breakdown.bill_warning_penalty}, "
            f"forensic_warning_penalty={breakdown.forensic_warning_penalty}"
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
        payload = CallbackPayload.from_response(response)
        callback_urls = build_callback_urls(
            base_url=settings.core_service_url,
            configured_endpoint=settings.callback_endpoint,
            gateway_path="/api/core/proofs/internal/hybrid-callback",
            direct_path="/proofs/internal/hybrid-callback",
        )

        logger.info("Sending callback to %s for proof %s", callback_urls, response.proof_id)

        for attempt in range(settings.callback_retry_count):
            for callback_url in callback_urls:
                try:
                    client = await self._get_http_client()
                    http_response = await client.post(
                        callback_url,
                        json=payload.model_dump(mode="json"),
                        headers={"Content-Type": "application/json"},
                    )

                    if http_response.status_code in (200, 201, 202):
                        logger.info("Callback successful for proof %s via %s", response.proof_id, callback_url)
                        return True

                    logger.warning(
                        "Callback attempt %s via %s failed: status=%s body=%s",
                        attempt + 1,
                        callback_url,
                        http_response.status_code,
                        http_response.text,
                    )
                except httpx.RequestError as exc:
                    logger.error(
                        "Callback request failed (attempt %s via %s): %s",
                        attempt + 1,
                        callback_url,
                        exc,
                    )

            if attempt < settings.callback_retry_count - 1:
                await asyncio.sleep(2 ** attempt)

        logger.error("All callback attempts failed for proof %s", response.proof_id)
        return False

    async def process(self, request: HybridReasoningRequest) -> HybridReasoningResponse:
        logger.info("Starting hybrid reasoning for proof %s", request.proof_id)
        start_time = datetime.now()

        vector_db_enabled = True
        try:
            await vector_db_service.initialize()
        except Exception as exc:
            vector_db_enabled = False
            logger.warning(
                "Vector DB unavailable, continue with local anti-fake only for proof %s: %s",
                request.proof_id,
                exc,
            )

        try:
            clip_task = self._analyze_scene_images(
                image_urls=request.list_image_url,
                withdrawal_reason=request.withdrawal_reason,
                campaign_id=request.campaign_id,
                vector_db_enabled=vector_db_enabled,
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
        except Exception as exc:
            logger.error("Hybrid reasoning failed for proof %s: %s", request.proof_id, exc, exc_info=True)

            error_response = HybridReasoningResponse(
                proof_id=request.proof_id,
                trust_score=0,
                is_valid=False,
                decision="SUSPICIOUS",
                rubric_version="day3-v1",
                analysis_summary=f"Loi xu ly: {exc}",
            )

            try:
                await self._send_callback(error_response)
            except Exception as callback_error:
                logger.error(
                    "Failed to send error callback for proof %s: %s",
                    request.proof_id,
                    callback_error,
                )

            return error_response


hybrid_reasoning_service = HybridReasoningService()
