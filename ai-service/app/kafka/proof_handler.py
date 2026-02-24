import logging
import asyncio
from datetime import datetime
from typing import Dict

from app.models.proof_events import (
    ProofVerificationRequest,
    ProofVerificationResult,
    ForensicsMetadata
)
#
from app.services.image_forensics import image_forensics_service
from app.services.llm_reasoning import llm_reasoning_service
from app.services.face_verification import face_verification_service
from app.utils.image_utils import download_image

logger = logging.getLogger(__name__)


class ProofVerificationHandler:
    """
    Handler để xử lý proof verification events
    
    Flow:
    1. Nhận ProofVerificationRequest từ Kafka
    2. Download proof image
    3. Route theo type (INVOICE hoặc SELFIE)
    4. Thực hiện verification tương ứng
    5. Return ProofVerificationResult
    """
    
    async def handle_invoice_proof(
        self,
        proof_id: str,
        image_bytes: bytes,
        context: dict
    ) -> ProofVerificationResult:
        """
        Xử lý proof loại INVOICE (hóa đơn)
        
        Steps:
        1. Image forensics (EXIF + hash)
        2. LLM analysis với Gemini
        3. Calculate final score
        
        Args:
            proof_id: ID của proof
            image_bytes: Binary data của ảnh hóa đơn
            context: Dict chứa campaignContext và withdrawalReason
            
        Returns:
            ProofVerificationResult
        """
        try:
            logger.info(f"Processing INVOICE proof: {proof_id}")
            
            # Step 1: Image forensics
            forensics_result = image_forensics_service.analyze(image_bytes)
            
            # Step 2: LLM analysis
            campaign_context = context.get("campaignContext", "Chiến dịch từ thiện")
            withdrawal_reason = context.get("withdrawalReason", "Không có lý do cụ thể")
            
            llm_result = await llm_reasoning_service.analyze_invoice(
                image_bytes,
                campaign_context,
                withdrawal_reason
            )
            
            # Step 3: Calculate final score
            # Forensics weight: 30%, LLM weight: 70%
            forensics_score = 0 if forensics_result["has_warning"] else 100
            llm_score = llm_result["score"]
            
            final_score = int(forensics_score * 0.3 + llm_score * 0.7)
            
            # Determine validity
            # Nếu có warning nghiêm trọng (edited software) -> invalid
            # Hoặc nếu LLM score < 70 -> invalid
            is_valid = llm_result["is_valid"] and not (
                forensics_result["has_warning"] and forensics_result["software_detected"]
            )
            
            # Build detailed analysis
            analysis_details = f"""**Phân tích Gemini AI:**
{llm_result['reasoning']}

**Kiểm tra Forensics:**
- EXIF: {forensics_result['details']}
- Software: {forensics_result['software_detected'] or 'Không phát hiện'}

**Điểm số:**
- Forensics: {forensics_score}/100
- LLM Analysis: {llm_score}/100
- Tổng điểm: {final_score}/100
"""
            
            # Create forensics metadata
            forensics_metadata = ForensicsMetadata(
                has_exif_warning=forensics_result["has_warning"],
                software_detected=forensics_result.get("software_detected", ""),
                perceptual_hash=forensics_result.get("perceptual_hash", ""),
                is_duplicate=forensics_result.get("is_duplicate", False),
                details=forensics_result.get("details", "")
            )
            
            return ProofVerificationResult(
                proofId=proof_id,
                score=final_score,
                isValid=is_valid,
                analysisDetails=analysis_details,
                metadata=forensics_metadata
            )
            
        except Exception as e:
            logger.error(f"Error processing INVOICE proof {proof_id}: {e}", exc_info=True)
            
            return ProofVerificationResult(
                proofId=proof_id,
                score=0,
                isValid=False,
                analysisDetails=f"Lỗi xử lý hóa đơn: {str(e)}",
                metadata=ForensicsMetadata(
                    has_exif_warning=True,
                    details=f"Error: {str(e)}"
                )
            )
    
    async def handle_selfie_proof(
        self,
        proof_id: str,
        image_bytes: bytes,
        context: dict
    ) -> ProofVerificationResult:
        """
        Xử lý proof loại SELFIE (ảnh tự chụp)
        
        Steps:
        1. Image forensics (EXIF + hash)
        2. Face verification với KYC image
        3. Calculate final score
        
        Args:
            proof_id: ID của proof
            image_bytes: Binary data của ảnh selfie
            context: Dict chứa kycImageUrl
            
        Returns:
            ProofVerificationResult
        """
        try:
            logger.info(f"Processing SELFIE proof: {proof_id}")
            
            # Step 1: Image forensics
            forensics_result = image_forensics_service.analyze(image_bytes)
            
            # Step 2: Download KYC image
            kyc_image_url = context.get("kycImageUrl")
            if not kyc_image_url:
                raise ValueError("Missing kycImageUrl in context")
            
            kyc_image_bytes = await download_image(kyc_image_url)
            
            # Step 3: Face verification
            face_result = await face_verification_service.verify_face(
                image_bytes,
                kyc_image_bytes
            )
            
            # Step 4: Calculate final score
            # Forensics weight: 20%, Face verification weight: 80%
            forensics_score = 0 if forensics_result["has_warning"] else 100
            face_score = face_result["score"]
            
            final_score = int(forensics_score * 0.2 + face_score * 0.8)
            
            # Determine validity
            # Cần cả face verified và không có warning nghiêm trọng
            is_valid = face_result["verified"] and not (
                forensics_result["has_warning"] and forensics_result["software_detected"]
            )
            
            # Build detailed analysis
            analysis_details = f"""**Xác thực Khuôn mặt:**
{face_result['details']}

**Kiểm tra Forensics:**
- EXIF: {forensics_result['details']}
- Software: {forensics_result['software_detected'] or 'Không phát hiện'}

**Điểm số:**
- Forensics: {forensics_score}/100
- Face Verification: {face_score}/100
- Tổng điểm: {final_score}/100
"""
            
            # Create forensics metadata
            forensics_metadata = ForensicsMetadata(
                has_exif_warning=forensics_result["has_warning"],
                software_detected=forensics_result.get("software_detected", ""),
                perceptual_hash=forensics_result.get("perceptual_hash", ""),
                is_duplicate=forensics_result.get("is_duplicate", False),
                details=forensics_result.get("details", "")
            )
            
            return ProofVerificationResult(
                proofId=proof_id,
                score=final_score,
                isValid=is_valid,
                analysisDetails=analysis_details,
                metadata=forensics_metadata
            )
            
        except Exception as e:
            logger.error(f"Error processing SELFIE proof {proof_id}: {e}", exc_info=True)
            
            return ProofVerificationResult(
                proofId=proof_id,
                score=0,
                isValid=False,
                analysisDetails=f"Lỗi xác thực selfie: {str(e)}",
                metadata=ForensicsMetadata(
                    has_exif_warning=True,
                    details=f"Error: {str(e)}"
                )
            )
    
    async def process_proof_verification(
        self,
        request: ProofVerificationRequest
    ) -> ProofVerificationResult:
        """
        Main entry point để xử lý proof verification request
        
        Args:
            request: ProofVerificationRequest event
            
        Returns:
            ProofVerificationResult
        """
        try:
            logger.info(f"Processing proof verification - Type: {request.type}, ID: {request.proofId}")
            
            # Download image
            image_bytes = await download_image(request.imageUrl)
            
            # Route theo type
            if request.type == "INVOICE":
                result = await self.handle_invoice_proof(
                    request.proofId,
                    image_bytes,
                    request.context
                )
            elif request.type == "SELFIE":
                result = await self.handle_selfie_proof(
                    request.proofId,
                    image_bytes,
                    request.context
                )
            else:
                raise ValueError(f"Unknown proof type: {request.type}")
            
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
