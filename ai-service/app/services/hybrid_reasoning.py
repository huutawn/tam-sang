"""
Hybrid Reasoning Service

Combines Local AI (CLIP) and Remote AI (Gemini) for comprehensive proof verification.
Implements Hybrid Embedding & Cross-modal Retrieval approach.
"""

import logging
import asyncio
import httpx
from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime

from app.config import settings
from app.services.clip_service import clip_service
from app.services.vector_db import vector_db_service
from app.services.llm_reasoning import llm_reasoning_service
from app.utils.image_utils import download_image
from app.models.hybrid_events import (
    HybridReasoningRequest,
    HybridReasoningResponse,
    ClipAnalysisResult,
    GeminiAnalysisResult,
    ImageRelevanceResult,
    DuplicateCheckResult,
    BillItem,
    CallbackPayload
)

logger = logging.getLogger(__name__)


class HybridReasoningService:
    """
    Hybrid Embedding & Cross-modal Retrieval Service
    
    Flow:
    1. CLIP Analysis (Local):
       - Compute embeddings for scene images (listImageUrl)
       - Compare with withdrawal_reason for relevance
       - Query pgvector for deduplication
       
    2. Gemini Analysis (Remote):
       - Analyze bill images (listBillImageUrl)
       - Extract amounts, items, verify prices
       - Check alignment with campaign_goal
       
    3. Combine Results:
       - Compute weighted trust score
       - Generate trust_hash for blockchain
       - Callback to Core-service
    """
    
    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None
        logger.info("HybridReasoningService initialized")
    
    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client for callbacks"""
        if self.http_client is None:
            self.http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.callback_timeout),
                follow_redirects=True
            )
        return self.http_client
    
    async def close(self):
        """Close HTTP client"""
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None
    
    async def _analyze_scene_images(
        self,
        image_urls: List[str],
        withdrawal_reason: str,
        campaign_id: str
    ) -> ClipAnalysisResult:
        """
        Analyze scene images using CLIP
        
        Steps:
        1. Download images
        2. Compute embeddings
        3. Check text-image relevance
        4. Check for duplicates in vector DB
        5. Store new embeddings
        """
        logger.info(f"Analyzing {len(image_urls)} scene images with CLIP")
        
        image_results = []
        duplicate_details = []
        total_similarity = 0.0
        has_duplicate = False
        
        for i, url in enumerate(image_urls):
            try:
                # Download image
                image_bytes = await download_image(url)
                
                # Check text-image relevance
                similarity, is_relevant, reasoning = clip_service.check_text_image_relevance(
                    image_bytes, withdrawal_reason
                )
                
                image_results.append(ImageRelevanceResult(
                    image_index=i,
                    image_url=url,
                    similarity=similarity,
                    is_relevant=is_relevant,
                    reasoning=reasoning
                ))
                total_similarity += similarity
                
                # Compute embedding for duplicate check and storage
                embedding = clip_service.compute_image_embedding(image_bytes)
                
                # Check for duplicates
                is_dup, matching_url = await vector_db_service.check_duplicate(embedding)
                if is_dup:
                    has_duplicate = True
                    duplicate_details.append(DuplicateCheckResult(
                        is_duplicate=True,
                        matching_url=matching_url,
                        similarity=0.98  # Near-exact match threshold
                    ))
                    logger.warning(f"Duplicate detected for image {i}: {matching_url}")
                else:
                    # Store new embedding
                    try:
                        campaign_uuid = UUID(campaign_id)
                        await vector_db_service.store_embedding(
                            campaign_id=campaign_uuid,
                            image_url=url,
                            embedding=embedding
                        )
                    except ValueError:
                        logger.warning(f"Invalid campaign_id format: {campaign_id}, skipping storage")
                
            except Exception as e:
                logger.error(f"Failed to analyze scene image {i} ({url}): {e}")
                image_results.append(ImageRelevanceResult(
                    image_index=i,
                    image_url=url,
                    similarity=0.0,
                    is_relevant=False,
                    reasoning=f"Lỗi phân tích: {str(e)}"
                ))
        
        avg_score = total_similarity / len(image_urls) if image_urls else 0.0
        
        return ClipAnalysisResult(
            scene_relevance_score=avg_score,
            image_results=image_results,
            duplicate_detected=has_duplicate,
            duplicate_details=duplicate_details
        )
    
    async def _analyze_bill_images(
        self,
        image_urls: List[str],
        withdrawal_reason: str,
        campaign_goal: str
    ) -> GeminiAnalysisResult:
        """
        Analyze bill images using Gemini
        
        For each bill:
        1. Download image
        2. Send to Gemini for analysis
        3. Extract items, amounts, validate prices
        """
        logger.info(f"Analyzing {len(image_urls)} bill images with Gemini")
        
        all_items = []
        total_amount = 0.0
        price_warnings = []
        all_valid = True
        all_reasoning = []
        total_score = 0
        
        for i, url in enumerate(image_urls):
            try:
                # Download image
                image_bytes = await download_image(url)
                
                # Analyze with Gemini (enhanced prompt)
                result = await llm_reasoning_service.analyze_invoice_detailed(
                    image_bytes=image_bytes,
                    withdrawal_reason=withdrawal_reason,
                    campaign_goal=campaign_goal
                )
                
                # Aggregate results
                if "items" in result:
                    for item_data in result["items"]:
                        all_items.append(BillItem(
                            name=item_data.get("name", "Unknown"),
                            quantity=float(item_data.get("quantity", 1)),
                            unit_price=float(item_data.get("unit_price", 0)),
                            total_price=float(item_data.get("total_price", 0)),
                            is_reasonable=item_data.get("is_reasonable", True)
                        ))
                
                total_amount += result.get("total_amount", 0)
                price_warnings.extend(result.get("price_warnings", []))
                
                if not result.get("serves_campaign_goal", True):
                    all_valid = False
                
                all_reasoning.append(
                    f"Hóa đơn {i+1}: {result.get('reasoning', 'Không có phân tích')}"
                )
                total_score += result.get("trust_score", 50)
                
            except Exception as e:
                logger.error(f"Failed to analyze bill image {i} ({url}): {e}")
                all_reasoning.append(f"Hóa đơn {i+1}: Lỗi phân tích - {str(e)}")
                total_score += 0
        
        avg_score = total_score // len(image_urls) if image_urls else 0
        combined_reasoning = "\n".join(all_reasoning)
        
        return GeminiAnalysisResult(
            total_amount=total_amount,
            items=all_items,
            price_warnings=price_warnings,
            serves_campaign_goal=all_valid,
            reasoning=combined_reasoning,
            trust_score=avg_score
        )
    
    def _compute_final_score(
        self,
        clip_result: ClipAnalysisResult,
        gemini_result: GeminiAnalysisResult
    ) -> Tuple[int, bool, str]:
        """
        Compute final trust score from CLIP and Gemini results
        
        Weights:
        - Scene relevance (CLIP): 30%
        - Bill analysis (Gemini): 60%
        - No duplicates bonus: 10%
        
        Returns:
            (trust_score, is_valid, summary)
        """
        # CLIP score (normalized to 0-100)
        clip_score = int(clip_result.scene_relevance_score * 100)
        
        # Gemini score
        gemini_score = gemini_result.trust_score
        
        # Duplicate penalty
        duplicate_penalty = 20 if clip_result.duplicate_detected else 0
        duplicate_bonus = 10 if not clip_result.duplicate_detected else 0
        
        # Price warning penalty
        price_penalty = min(len(gemini_result.price_warnings) * 5, 20)
        
        # Weighted calculation
        final_score = int(
            clip_score * 0.3 +
            gemini_score * 0.6 +
            duplicate_bonus -
            duplicate_penalty -
            price_penalty
        )
        
        # Clamp to 0-100
        final_score = max(0, min(100, final_score))
        
        # Determine validity (score >= 70 and no critical issues)
        is_valid = (
            final_score >= 70 and
            not clip_result.duplicate_detected and
            gemini_result.serves_campaign_goal and
            len(gemini_result.price_warnings) < 3
        )
        
        # Generate summary
        summary_parts = []
        
        if clip_result.scene_relevance_score >= 0.25:
            summary_parts.append(f"Ảnh hiện trường phù hợp (điểm: {clip_score}%)")
        else:
            summary_parts.append(f"Ảnh hiện trường KHÔNG phù hợp (điểm: {clip_score}%)")
        
        if clip_result.duplicate_detected:
            summary_parts.append("⚠️ PHÁT HIỆN ẢNH TRÙNG LẶP")
        
        summary_parts.append(f"Hóa đơn: tổng {gemini_result.total_amount:,.0f}đ, {len(gemini_result.items)} mục")
        
        if gemini_result.price_warnings:
            summary_parts.append(f"⚠️ {len(gemini_result.price_warnings)} cảnh báo đơn giá")
        
        if gemini_result.serves_campaign_goal:
            summary_parts.append("✅ Phù hợp mục tiêu chiến dịch")
        else:
            summary_parts.append("❌ KHÔNG phù hợp mục tiêu chiến dịch")
        
        summary_parts.append(f"**Điểm tin cậy: {final_score}/100**")
        
        summary = " | ".join(summary_parts)
        
        return final_score, is_valid, summary
    
    async def _send_callback(self, response: HybridReasoningResponse) -> bool:
        """
        Send verification result to Core-service via HTTP callback
        
        Returns:
            True if callback successful, False otherwise
        """
        callback_url = f"{settings.core_service_url}{settings.callback_endpoint}"
        
        logger.info(f"Sending callback to {callback_url} for proof {response.proof_id}")
        
        payload = CallbackPayload.from_response(response)
        
        for attempt in range(settings.callback_retry_count):
            try:
                client = await self._get_http_client()
                
                http_response = await client.post(
                    callback_url,
                    json=payload.model_dump(mode="json"),
                    headers={"Content-Type": "application/json"}
                )
                
                if http_response.status_code in (200, 201, 202):
                    logger.info(f"Callback successful for proof {response.proof_id}")
                    return True
                else:
                    logger.warning(
                        f"Callback attempt {attempt + 1} failed: "
                        f"status={http_response.status_code}, body={http_response.text}"
                    )
                    
            except httpx.RequestError as e:
                logger.error(f"Callback request failed (attempt {attempt + 1}): {e}")
            
            # Wait before retry
            if attempt < settings.callback_retry_count - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        logger.error(f"All callback attempts failed for proof {response.proof_id}")
        return False
    
    async def process(self, request: HybridReasoningRequest) -> HybridReasoningResponse:
        """
        Main entry point for hybrid reasoning
        
        Args:
            request: HybridReasoningRequest with proof details
            
        Returns:
            HybridReasoningResponse with verification results
        """
        logger.info(f"Starting hybrid reasoning for proof {request.proof_id}")
        start_time = datetime.now()
        
        try:
            # Initialize services
            await vector_db_service.initialize()
            
            # Run CLIP and Gemini analysis in parallel
            clip_task = self._analyze_scene_images(
                image_urls=request.list_image_url,
                withdrawal_reason=request.withdrawal_reason,
                campaign_id=request.campaign_id
            )
            
            gemini_task = self._analyze_bill_images(
                image_urls=request.list_bill_image_url,
                withdrawal_reason=request.withdrawal_reason,
                campaign_goal=request.campaign_goal
            )
            
            clip_result, gemini_result = await asyncio.gather(
                clip_task, gemini_task,
                return_exceptions=True
            )
            
            # Handle exceptions
            if isinstance(clip_result, Exception):
                logger.error(f"CLIP analysis failed: {clip_result}")
                clip_result = ClipAnalysisResult()
            
            if isinstance(gemini_result, Exception):
                logger.error(f"Gemini analysis failed: {gemini_result}")
                gemini_result = GeminiAnalysisResult()
            
            # Compute final score
            trust_score, is_valid, summary = self._compute_final_score(
                clip_result, gemini_result
            )
            
            # Build response
            response = HybridReasoningResponse(
                proof_id=request.proof_id,
                trust_score=trust_score,
                is_valid=is_valid,
                clip_analysis=clip_result,
                gemini_analysis=gemini_result,
                analysis_summary=summary
            )
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(
                f"Hybrid reasoning complete for proof {request.proof_id}: "
                f"score={trust_score}, valid={is_valid}, elapsed={elapsed:.2f}s"
            )
            
            # Send callback to Core-service
            callback_success = await self._send_callback(response)
            if not callback_success:
                logger.warning(f"Callback failed for proof {request.proof_id}, result still valid")
            
            return response
            
        except Exception as e:
            logger.error(f"Hybrid reasoning failed for proof {request.proof_id}: {e}", exc_info=True)
            
            # Build error response and notify Core-service via callback
            error_response = HybridReasoningResponse(
                proof_id=request.proof_id,
                trust_score=0,
                is_valid=False,
                analysis_summary=f"Lỗi xử lý: {str(e)}"
            )
            
            # Best-effort callback so Core-service can mark proof as REJECTED
            # instead of leaving it stuck in PROCESSING state forever.
            try:
                await self._send_callback(error_response)
            except Exception as cb_err:
                logger.error(
                    f"Failed to send error callback for proof {request.proof_id}: {cb_err}"
                )
            
            return error_response


# Singleton instance
hybrid_reasoning_service = HybridReasoningService()
