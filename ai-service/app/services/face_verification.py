import asyncio
import io
import logging
import os
import tempfile
from functools import partial
from typing import Dict, Optional, Tuple

import cv2
from deepface import DeepFace
from PIL import Image

logger = logging.getLogger(__name__)


class FaceVerificationService:
    """
    Compare selfie vs. KYC document portrait for withdrawal verification.

    Key changes:
    - crop the face region before DeepFace verification
    - use `enforce_detection=False` after preparation to avoid instant hard-fail
    - fall back to a heuristic portrait crop for ID-card images
    """

    def __init__(self):
        logger.info("Face Verification Service initialized")
        self.model_name = "VGG-Face"
        self.detector_backend = "opencv"

    def _save_temp_image(self, image_bytes: bytes, prefix: str = "temp") -> str:
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".jpg",
            prefix=f"{prefix}_",
        )

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image.save(temp_file.name, format="JPEG", quality=95)
        temp_file.close()
        logger.debug("Saved temporary image: %s", temp_file.name)
        return temp_file.name

    def _cleanup_temp_files(self, *file_paths):
        for file_path in file_paths:
            try:
                if file_path and os.path.exists(file_path):
                    os.unlink(file_path)
                    logger.debug("Cleaned up temp file: %s", file_path)
            except Exception as exc:
                logger.warning("Failed to cleanup temp file %s: %s", file_path, exc)

    def _run_deepface_verify(self, selfie_path: str, kyc_path: str) -> dict:
        return DeepFace.verify(
            img1_path=selfie_path,
            img2_path=kyc_path,
            model_name=self.model_name,
            detector_backend=self.detector_backend,
            enforce_detection=False,
        )

    def _detect_face_box(self, image_path: str) -> Optional[Tuple[int, int, int, int]]:
        image = cv2.imread(image_path)
        if image is None:
            return None

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(40, 40),
        )
        if len(faces) == 0:
            return None

        x, y, w, h = max(faces, key=lambda face: face[2] * face[3])
        pad_w = int(w * 0.2)
        pad_h = int(h * 0.2)

        left = max(0, x - pad_w)
        top = max(0, y - pad_h)
        right = min(image.shape[1], x + w + pad_w)
        bottom = min(image.shape[0], y + h + pad_h)
        return left, top, right, bottom

    def _heuristic_document_face_box(self, image_path: str) -> Optional[Tuple[int, int, int, int]]:
        image = Image.open(image_path).convert("RGB")
        width, height = image.size
        if width <= 0 or height <= 0:
            return None

        # Vietnamese ID front portrait is usually on the left side.
        left = int(width * 0.02)
        top = int(height * 0.12)
        right = int(width * 0.42)
        bottom = int(height * 0.88)
        if right <= left or bottom <= top:
            return None
        return left, top, right, bottom

    def _save_cropped_face(self, image_path: str, crop_box: Tuple[int, int, int, int], prefix: str) -> str:
        image = Image.open(image_path).convert("RGB")
        cropped = image.crop(crop_box)

        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".jpg",
            prefix=f"{prefix}_",
        )
        cropped.save(temp_file.name, format="JPEG", quality=95)
        temp_file.close()
        logger.debug("Saved cropped face image: %s", temp_file.name)
        return temp_file.name

    def _prepare_face_image(self, image_path: str, prefix: str, *, document_hint: bool) -> str:
        detected_box = self._detect_face_box(image_path)
        if detected_box:
            logger.info("Detected face for %s using OpenCV cascade", prefix)
            return self._save_cropped_face(image_path, detected_box, prefix)

        if document_hint:
            heuristic_box = self._heuristic_document_face_box(image_path)
            if heuristic_box:
                logger.warning("No face detected for %s, using document portrait heuristic crop", prefix)
                return self._save_cropped_face(image_path, heuristic_box, prefix)

        logger.warning("No face crop prepared for %s, using original image", prefix)
        return image_path

    def _compute_score(self, verified: bool, distance: float, threshold: float) -> int:
        safe_threshold = max(threshold, 1e-6)
        ratio = distance / safe_threshold

        if verified:
            return max(80, min(100, int(round((1 - min(ratio, 1.0)) * 100))))

        softened_ratio = min(ratio, 1.75)
        return max(0, min(79, int(round((1.75 - softened_ratio) / 1.75 * 100))))

    async def verify_face(self, selfie_bytes: bytes, kyc_image_bytes: bytes) -> Dict:
        selfie_path = None
        kyc_path = None
        prepared_selfie_path = None
        prepared_kyc_path = None

        try:
            logger.info("Starting face verification")

            selfie_path = self._save_temp_image(selfie_bytes, "selfie")
            kyc_path = self._save_temp_image(kyc_image_bytes, "kyc")

            prepared_selfie_path = self._prepare_face_image(
                selfie_path,
                "selfie_face",
                document_hint=False,
            )
            prepared_kyc_path = self._prepare_face_image(
                kyc_path,
                "kyc_face",
                document_hint=True,
            )

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                partial(self._run_deepface_verify, prepared_selfie_path, prepared_kyc_path),
            )

            verified = bool(result["verified"])
            distance = float(result["distance"])
            threshold = float(result["threshold"])
            score = self._compute_score(verified, distance, threshold)

            logger.info(
                "Face verification complete - Verified: %s, Distance: %.4f, Threshold: %.4f, Score: %s",
                verified,
                distance,
                threshold,
                score,
            )

            return {
                "verified": verified,
                "distance": distance,
                "threshold": threshold,
                "score": score,
                "details": (
                    f"Face match: {verified}. Distance: {distance:.4f} (threshold: {threshold:.4f}). "
                    f"Prepared selfie={prepared_selfie_path != selfie_path}, "
                    f"prepared KYC={prepared_kyc_path != kyc_path}"
                ),
            }

        except ValueError as exc:
            error_msg = str(exc)
            logger.warning("Face verification failed with ValueError: %s", error_msg)
            return {
                "verified": False,
                "distance": 1.0,
                "threshold": 0.5,
                "score": 0,
                "details": f"Loi xu ly anh khi verify khuon mat: {error_msg}",
            }

        except Exception as exc:
            error_msg = str(exc)
            logger.error("Error in face verification: %s", error_msg, exc_info=True)
            return {
                "verified": False,
                "distance": 1.0,
                "threshold": 0.5,
                "score": 0,
                "details": f"Loi he thong khi verify khuon mat: {error_msg}",
            }

        finally:
            self._cleanup_temp_files(
                prepared_selfie_path if prepared_selfie_path != selfie_path else None,
                prepared_kyc_path if prepared_kyc_path != kyc_path else None,
                selfie_path,
                kyc_path,
            )


face_verification_service = FaceVerificationService()
