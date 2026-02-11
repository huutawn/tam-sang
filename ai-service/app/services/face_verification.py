import logging
import os
import asyncio
import tempfile
from typing import Dict
from functools import partial
from deepface import DeepFace
import io
from PIL import Image

logger = logging.getLogger(__name__)


class FaceVerificationService:
    """
    Service để verify khuôn mặt giữa ảnh selfie và ảnh KYC (CMND/CCCD)
    
    Sử dụng DeepFace library với model VGG-Face.
    DeepFace.verify() is CPU-bound (neural network inference), so it is
    offloaded to a thread pool executor to avoid blocking the asyncio loop.
    """
    
    def __init__(self):
        """Initialize Face Verification Service"""
        logger.info("Face Verification Service initialized")
        # DeepFace sẽ tự động download models khi cần
    
    def _save_temp_image(self, image_bytes: bytes, prefix: str = "temp") -> str:
        """
        Save image bytes to temporary file
        (DeepFace yêu cầu file paths, không nhận bytes)
        """
        try:
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, 
                suffix=".jpg",
                prefix=f"{prefix}_"
            )
            
            image = Image.open(io.BytesIO(image_bytes))
            image.save(temp_file.name, format="JPEG")
            temp_file.close()
            
            logger.debug(f"Saved temporary image: {temp_file.name}")
            return temp_file.name
            
        except Exception as e:
            logger.error(f"Error saving temp image: {e}")
            raise
    
    def _cleanup_temp_files(self, *file_paths):
        """Delete temporary files"""
        for file_path in file_paths:
            try:
                if file_path and os.path.exists(file_path):
                    os.unlink(file_path)
                    logger.debug(f"Cleaned up temp file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file {file_path}: {e}")
    
    def _run_deepface_verify(self, selfie_path: str, kyc_path: str) -> dict:
        """
        Run DeepFace.verify synchronously (called from executor).
        
        This method is CPU-bound and should NOT be called directly
        from async code; use verify_face() instead.
        """
        return DeepFace.verify(
            img1_path=selfie_path,
            img2_path=kyc_path,
            model_name="VGG-Face",
            detector_backend="opencv",
            enforce_detection=True
        )
    
    async def verify_face(
        self, 
        selfie_bytes: bytes, 
        kyc_image_bytes: bytes
    ) -> Dict:
        """
        So sánh khuôn mặt giữa ảnh selfie và ảnh KYC
        
        DeepFace.verify is offloaded to a thread pool executor since it
        performs CPU-intensive neural network inference that would otherwise
        block the asyncio event loop for several seconds.
        
        Returns:
            Dict với keys: verified, distance, threshold, score, details
        """
        selfie_path = None
        kyc_path = None
        
        try:
            logger.info("Starting face verification")
            
            # Save images to temp files
            selfie_path = self._save_temp_image(selfie_bytes, "selfie")
            kyc_path = self._save_temp_image(kyc_image_bytes, "kyc")
            
            # Offload CPU-bound DeepFace inference to thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,  # Use default ThreadPoolExecutor
                partial(self._run_deepface_verify, selfie_path, kyc_path)
            )
            
            verified = result["verified"]
            distance = result["distance"]
            threshold = result["threshold"]
            
            # Calculate score (0-100)
            if verified:
                score = min(100, int((1 - distance / threshold) * 100))
            else:
                score = max(0, int((1 - distance / threshold) * 100))
            
            logger.info(f"Face verification complete - Verified: {verified}, Distance: {distance:.4f}, Score: {score}")
            
            return {
                "verified": verified,
                "distance": float(distance),
                "threshold": float(threshold),
                "score": score,
                "details": f"Face match: {verified}. Distance: {distance:.4f} (threshold: {threshold:.4f})"
            }
            
        except ValueError as e:
            error_msg = str(e)
            logger.warning(f"Face verification failed: {error_msg}")
            
            if "Face could not be detected" in error_msg or "no face" in error_msg.lower():
                return {
                    "verified": False,
                    "distance": 1.0,
                    "threshold": 0.5,
                    "score": 0,
                    "details": "Không phát hiện được khuôn mặt trong ảnh. Vui lòng chụp lại ảnh rõ hơn."
                }
            else:
                return {
                    "verified": False,
                    "distance": 1.0,
                    "threshold": 0.5,
                    "score": 0,
                    "details": f"Lỗi xử lý ảnh: {error_msg}"
                }
                
        except Exception as e:
            logger.error(f"Error in face verification: {e}", exc_info=True)
            return {
                "verified": False,
                "distance": 1.0,
                "threshold": 0.5,
                "score": 0,
                "details": f"Lỗi hệ thống khi verify khuôn mặt: {str(e)}"
            }
            
        finally:
            self._cleanup_temp_files(selfie_path, kyc_path)


# Singleton instance
face_verification_service = FaceVerificationService()

