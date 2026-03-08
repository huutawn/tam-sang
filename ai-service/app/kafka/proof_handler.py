import logging
import asyncio
from datetime import datetime
from typing import Dict, List

from app.models.proof_events import (
    ProofVerificationRequest,
    ProofVerificationResult,
    ForensicsMetadata
)
#
from app.services.image_forensics import image_forensics_service
from app.services.llm_reasoning import llm_reasoning_service
from app.utils.image_utils import download_image

logger = logging.getLogger(__name__)


class ProofVerificationHandler:
    """
    Handler để xử lý proof verification events
    
    Flow:
    1. Nhận ProofVerificationRequest từ Kafka
    2. Download proof images (bills + scenes)
    3. Xử lý bill images: forensics + LLM per image
    4. Xử lý scene images: forensics per image
    5. Aggregate scores and return ProofVerificationResult
    """
    
    async def handle_bill_images(
        self,
        proof_id: str,
        bill_image_bytes_list: List[bytes],
        context: dict
    ) -> dict:
        """
        Xử lý danh sách ảnh hóa đơn (INVOICE)
        
        Steps per image:
        1. Image forensics (EXIF + hash)
        2. LLM analysis với Gemini
        
        Returns:
            dict with aggregated score, validity, analysis, and forensics
        """
        if not bill_image_bytes_list:
            return {
                "score": 0,
                "is_valid": True,
                "analysis": "Không có ảnh hóa đơn",
                "forensics_warnings": False,
                "software_detected": ""
            }
        
        total_score = 0
        all_valid = True
        analyses = []
        any_forensics_warning = False
        any_software = ""
        
        campaign_context = context.get("campaignContext", "Chiến dịch từ thiện")
        withdrawal_reason = context.get("withdrawalReason", "Không có lý do cụ thể")
        
        for i, image_bytes in enumerate(bill_image_bytes_list):
            try:
                logger.info(f"--- [Bill {i+1}/{len(bill_image_bytes_list)}] Starting analysis ---")
                
                # Forensics
                logger.info(f"[Bill {i+1}] Running forensics...")
                forensics_result = image_forensics_service.analyze(image_bytes)
                if forensics_result["has_warning"]:
                    any_forensics_warning = True
                if forensics_result.get("software_detected"):
                    any_software = forensics_result["software_detected"]
                logger.info(f"[Bill {i+1}] Forensics complete (warning={forensics_result['has_warning']})")
                
                # LLM analysis
                logger.info(f"[Bill {i+1}] Starting Gemini analysis...")
                llm_result = await llm_reasoning_service.analyze_invoice(
                    image_bytes, campaign_context, withdrawal_reason
                )
                logger.info(f"[Bill {i+1}] Gemini analysis complete (score={llm_result['score']})")
                
                forensics_score = 0 if forensics_result["has_warning"] else 100
                llm_score = llm_result["score"]
                image_score = int(forensics_score * 0.3 + llm_score * 0.7)
                
                total_score += image_score
                if not llm_result["is_valid"] or (forensics_result["has_warning"] and forensics_result["software_detected"]):
                    all_valid = False
                
                analyses.append(f"**Hóa đơn {i+1}:** Score={image_score}/100\n{llm_result['reasoning']}")
                logger.info(f"[Bill {i+1}] Done.")
                
            except Exception as e:
                logger.error(f"Error processing bill image {i+1} for proof {proof_id}: {e}", exc_info=True)
                analyses.append(f"**Hóa đơn {i+1}:** Lỗi xử lý: {str(e)}")
                all_valid = False
        
        avg_score = total_score // len(bill_image_bytes_list) if bill_image_bytes_list else 0
        
        return {
            "score": avg_score,
            "is_valid": all_valid,
            "analysis": "\n\n".join(analyses),
            "forensics_warnings": any_forensics_warning,
            "software_detected": any_software
        }
    
    async def handle_scene_images(
        self,
        proof_id: str,
        scene_image_bytes_list: List[bytes],
    ) -> dict:
        """
        Xử lý danh sách ảnh hiện trường
        
        Steps per image:
        1. Image forensics (EXIF + hash)
        
        Returns:
            dict with aggregated forensics info
        """
        if not scene_image_bytes_list:
            return {
                "score": 100,
                "analysis": "Không có ảnh hiện trường",
                "forensics_warnings": False,
                "software_detected": "",
                "is_duplicate": False
            }
        
        total_score = 0
        analyses = []
        any_warning = False
        any_software = ""
        any_duplicate = False
        
        for i, image_bytes in enumerate(scene_image_bytes_list):
            try:
                logger.info(f"--- [Scene {i+1}/{len(scene_image_bytes_list)}] Starting forensics ---")
                forensics_result = image_forensics_service.analyze(image_bytes)
                
                if forensics_result["has_warning"]:
                    any_warning = True
                if forensics_result.get("software_detected"):
                    any_software = forensics_result["software_detected"]
                if forensics_result.get("is_duplicate"):
                    any_duplicate = True
                
                image_score = 0 if forensics_result["has_warning"] else 100
                total_score += image_score
                
                analyses.append(
                    f"**Ảnh hiện trường {i+1}:** "
                    f"EXIF={'⚠️' if forensics_result['has_warning'] else '✅'} "
                    f"| {forensics_result.get('details', 'OK')}"
                )
                logger.info(f"[Scene {i+1}] Forensics complete.")
                
            except Exception as e:
                logger.error(f"Error processing scene image {i+1} for proof {proof_id}: {e}", exc_info=True)
                analyses.append(f"**Ảnh hiện trường {i+1}:** Lỗi: {str(e)}")
        
        avg_score = total_score // len(scene_image_bytes_list) if scene_image_bytes_list else 100
        
        return {
            "score": avg_score,
            "analysis": "\n".join(analyses),
            "forensics_warnings": any_warning,
            "software_detected": any_software,
            "is_duplicate": any_duplicate
        }
    
    async def process_proof_verification(
        self,
        request: ProofVerificationRequest
    ) -> ProofVerificationResult:
        """
        Main entry point để xử lý proof verification request.
        Images are pre-categorized into bill images and scene images.
        
        Args:
            request: ProofVerificationRequest event
            
        Returns:
            ProofVerificationResult
        """
        try:
            logger.info(
                f"Processing proof verification - ID: {request.proofId}, "
                f"bills: {len(request.billImageUrls)}, scenes: {len(request.sceneImageUrls)}"
            )
            
            # Download all images concurrently
            bill_download_tasks = [download_image(url) for url in request.billImageUrls]
            scene_download_tasks = [download_image(url) for url in request.sceneImageUrls]
            
            bill_images = await asyncio.gather(*bill_download_tasks, return_exceptions=True)
            scene_images = await asyncio.gather(*scene_download_tasks, return_exceptions=True)
            
            # Filter out failed downloads
            bill_bytes = [img for img in bill_images if isinstance(img, bytes)]
            scene_bytes = [img for img in scene_images if isinstance(img, bytes)]
            
            # Process each category
            bill_result = await self.handle_bill_images(request.proofId, bill_bytes, request.context)
            scene_result = await self.handle_scene_images(request.proofId, scene_bytes)
            
            # Aggregate: bills weight 70%, scenes weight 30%
            has_bills = len(bill_bytes) > 0
            has_scenes = len(scene_bytes) > 0
            
            if has_bills and has_scenes:
                final_score = int(bill_result["score"] * 0.7 + scene_result["score"] * 0.3)
            elif has_bills:
                final_score = bill_result["score"]
            elif has_scenes:
                final_score = scene_result["score"]
            else:
                final_score = 0
            
            is_valid = bill_result["is_valid"] and not (
                scene_result.get("forensics_warnings") and scene_result.get("software_detected")
            )
            
            # Build combined analysis
            analysis_parts = []
            if has_bills:
                analysis_parts.append(f"## Phân tích hóa đơn ({len(bill_bytes)} ảnh)\n{bill_result['analysis']}")
            if has_scenes:
                analysis_parts.append(f"## Kiểm tra hiện trường ({len(scene_bytes)} ảnh)\n{scene_result['analysis']}")
            analysis_parts.append(f"\n**Tổng điểm: {final_score}/100**")
            
            analysis_details = "\n\n".join(analysis_parts)
            
            # Build forensics metadata
            forensics_metadata = ForensicsMetadata(
                has_exif_warning=bill_result["forensics_warnings"] or scene_result.get("forensics_warnings", False),
                software_detected=bill_result.get("software_detected", "") or scene_result.get("software_detected", ""),
                is_duplicate=scene_result.get("is_duplicate", False),
            )
            
            result = ProofVerificationResult(
                proofId=request.proofId,
                score=final_score,
                isValid=is_valid,
                analysisDetails=analysis_details,
                metadata=forensics_metadata
            )
            
            logger.info(f"Proof verification complete - ID: {request.proofId}, Score: {result.score}, Valid: {result.isValid}")
            return result
            
        except Exception as e:
            logger.error(f"Error in proof verification handler: {e}", exc_info=True)
            
            return ProofVerificationResult(
                proofId=request.proofId,
                score=0,
                isValid=False,
                analysisDetails=f"Lỗi hệ thống: {str(e)}",
                metadata=ForensicsMetadata(
                    has_exif_warning=True,
                    details=f"System error: {str(e)}"
                )
            )


# Singleton instance
proof_verification_handler = ProofVerificationHandler()
