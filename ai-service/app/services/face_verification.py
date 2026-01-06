import logging
import os
import tempfile
from typing import Dict
from deepface import DeepFace
import io
from PIL import Image

logger = logging.getLogger(__name__)


class FaceVerificationService:
    """
    Service để verify khuôn mặt giữa ảnh selfie và ảnh KYC (CMND/CCCD)
    
    Sử dụng DeepFace library với model VGG-Face
    """
    
    def __init__(self):
        """Initialize Face Verification Service"""
        logger.info("Face Verification Service initialized")
        # DeepFace sẽ tự động download models khi cần
    
    def _save_temp_image(self, image_bytes: bytes, prefix: str = "temp") -> str:
        """
        Save image bytes to temporary file
        (DeepFace yêu cầu file paths, không nhận bytes)
        
        Args:
            image_bytes: Binary data của ảnh
            prefix: Prefix cho temp file name
            
        Returns:
            Path to temporary file
        """
        try:
            # Create temp file
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, 
                suffix=".jpg",
                prefix=f"{prefix}_"
            )
            
            # Save image
            image = Image.open(io.BytesIO(image_bytes))
            image.save(temp_file.name, format="JPEG")
            temp_file.close()
            
            logger.debug(f"Saved temporary image: {temp_file.name}")
            return temp_file.name
            
        except Exception as e:
            logger.error(f"Error saving temp image: {e}")
            raise
    
    def _cleanup_temp_files(self, *file_paths):
        """
        Delete temporary files
        
        Args:
            *file_paths: Variable number of file paths to delete
        """
        for file_path in file_paths:
            try:
                if file_path and os.path.exists(file_path):
                    os.unlink(file_path)
                    logger.debug(f"Cleaned up temp file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file {file_path}: {e}")
    
    async def verify_face(
        self, 
        selfie_bytes: bytes, 
        kyc_image_bytes: bytes
    ) -> Dict:
        """
        So sánh khuôn mặt giữa ảnh selfie và ảnh KYC
        
        Args:
            selfie_bytes: Binary data của ảnh selfie
            kyc_image_bytes: Binary data của ảnh CMND/CCCD
            
        Returns:
            Dict với keys:
            - verified: bool - Khuôn mặt có khớp không
            - distance: float - Khoảng cách giữa 2 khuôn mặt
            - threshold: float - Ngưỡng để xác định khớp
            - score: int - Điểm 0-100
            - details: str - Chi tiết
        """
        selfie_path = None
        kyc_path = None
        
        try:
            logger.info("Starting face verification")
            
            # Save images to temp files
            selfie_path = self._save_temp_image(selfie_bytes, "selfie")
            kyc_path = self._save_temp_image(kyc_image_bytes, "kyc")
            
            # Verify với DeepFace
            # model_name: VGG-Face, Facenet, OpenFace, DeepFace, DeepID, ArcFace, Dlib
            # detector_backend: opencv, ssd, dlib, mtcnn, retinaface
            result = DeepFace.verify(
                img1_path=selfie_path,
                img2_path=kyc_path,
                model_name="VGG-Face",
                detector_backend="opencv",
                enforce_detection=True  # Require face detection
            )
            
            verified = result["verified"]
            distance = result["distance"]
            threshold = result["threshold"]
            
            # Calculate score (0-100)
            if verified:
                # Càng gần 0 càng giống -> score cao
                score = min(100, int((1 - distance / threshold) * 100))
            else:
                # Nếu không verify, score thấp
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
            # Face not detected
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
            # Cleanup temp files
            self._cleanup_temp_files(selfie_path, kyc_path)


# Singleton instance
face_verification_service = FaceVerificationService()
