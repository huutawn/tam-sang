import io
import logging
from typing import Any, Dict, Optional

import imagehash
from PIL import Image, UnidentifiedImageError
from PIL.ExifTags import TAGS

logger = logging.getLogger(__name__)


class ImageForensicsService:
    """
    Soft-signal forensics for proof images.

    The goal is to add fraud-resistance without making brittle claims:
    - EXIF is supportive metadata, not a truth oracle.
    - perceptual hashes are used for exact/near-duplicate detection.
    """

    EDITING_SOFTWARE = [
        "adobe photoshop",
        "lightroom",
        "gimp",
        "paint.net",
        "affinity photo",
        "corel paintshop",
        "photoscape",
        "pixlr",
        "snapseed",
        "canva",
    ]

    HASH_BITS = 64
    EXACT_HASH_SIMILARITY = 0.995
    NEAR_HASH_SIMILARITY = 0.92

    def __init__(self):
        logger.info("Image Forensics Service initialized")

    def _open_image(self, image_bytes: bytes) -> Image.Image:
        return Image.open(io.BytesIO(image_bytes))

    def _extract_exif(self, image: Image.Image) -> Dict[str, Any]:
        exif_data = getattr(image, "getexif", lambda: None)()
        if not exif_data:
            legacy = getattr(image, "_getexif", lambda: None)()
            exif_data = legacy

        if not exif_data:
            return {}

        parsed: Dict[str, Any] = {}
        for tag_id, value in exif_data.items():
            parsed[TAGS.get(tag_id, str(tag_id))] = value
        return parsed

    def check_metadata(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Inspect metadata as a soft signal.

        Missing EXIF is common after chat/social uploads, so it only reduces
        confidence slightly and never means "fake" by itself.
        """
        try:
            image = self._open_image(image_bytes)
            exif = self._extract_exif(image)
            warnings: list[str] = []
            authenticity_score = 100

            if not exif:
                warnings.append("Không có EXIF gốc; đây chỉ là tín hiệu yếu, không đủ để kết luận ảnh giả.")
                authenticity_score -= 5
                return {
                    "has_warning": True,
                    "has_exif": False,
                    "software_detected": "",
                    "camera_make": "",
                    "camera_model": "",
                    "datetime_original": "",
                    "warnings": warnings,
                    "authenticity_score": max(0, authenticity_score),
                    "details": "Không tìm thấy EXIF.",
                }

            software = str(exif.get("Software", "") or "").strip()
            make = str(exif.get("Make", "") or "").strip()
            model = str(exif.get("Model", "") or "").strip()
            datetime_original = str(exif.get("DateTimeOriginal", "") or "").strip()

            editing_software = ""
            if software:
                lowered = software.lower()
                for editing_app in self.EDITING_SOFTWARE:
                    if editing_app in lowered:
                        editing_software = software
                        warnings.append(f"Metadata ghi nhan phan mem chinh sua: {software}")
                        authenticity_score -= 25
                        break

            if not datetime_original:
                warnings.append("Không tìm thấy thời điểm chụp gốc trong EXIF.")
                authenticity_score -= 5

            if not make and not model:
                warnings.append("EXIF có tồn tại nhưng không có thông tin thiết bị chụp.")
                authenticity_score -= 5

            return {
                "has_warning": bool(warnings),
                "has_exif": True,
                "software_detected": editing_software,
                "camera_make": make,
                "camera_model": model,
                "datetime_original": datetime_original,
                "warnings": warnings,
                "authenticity_score": max(0, authenticity_score),
                "details": f"EXIF hop le tu {make} {model}".strip(),
            }
        except (UnidentifiedImageError, OSError) as exc:
            logger.error("Unable to read image metadata: %s", exc)
            return {
                "has_warning": True,
                "has_exif": False,
                "software_detected": "",
                "camera_make": "",
                "camera_model": "",
                "datetime_original": "",
                "warnings": [f"Không đọc được metadata ảnh: {exc}"],
                "authenticity_score": 70,
                "details": f"Lỗi đọc metadata: {exc}",
            }
        except Exception as exc:
            logger.error("Unexpected metadata inspection error: %s", exc)
            return {
                "has_warning": True,
                "has_exif": False,
                "software_detected": "",
                "camera_make": "",
                "camera_model": "",
                "datetime_original": "",
                "warnings": [f"Lỗi phân tích metadata: {exc}"],
                "authenticity_score": 65,
                "details": f"Lỗi phân tích metadata: {exc}",
            }

    def compute_hashes(self, image_bytes: bytes) -> Dict[str, Any]:
        """Compute multiple perceptual hashes for duplicate detection."""
        try:
            image = self._open_image(image_bytes).convert("RGB")
            phash = str(imagehash.phash(image))
            dhash = str(imagehash.dhash(image))
            ahash = str(imagehash.average_hash(image))
            combined_hash = f"p:{phash}|d:{dhash}|a:{ahash}"

            return {
                "perceptual_hash": combined_hash,
                "phash": phash,
                "dhash": dhash,
                "ahash": ahash,
            }
        except Exception as exc:
            logger.error("Error computing perceptual hashes: %s", exc)
            return {
                "perceptual_hash": "",
                "phash": "",
                "dhash": "",
                "ahash": "",
            }

    def _parse_combined_hash(self, combined_hash: str) -> Dict[str, str]:
        result = {"p": "", "d": "", "a": ""}
        if not combined_hash:
            return result

        for segment in combined_hash.split("|"):
            if ":" not in segment:
                continue
            key, value = segment.split(":", 1)
            if key in result:
                result[key] = value
        return result

    def _hash_similarity(self, left_hex: str, right_hex: str) -> Optional[float]:
        if not left_hex or not right_hex:
            return None
        try:
            left_hash = imagehash.hex_to_hash(left_hex)
            right_hash = imagehash.hex_to_hash(right_hex)
            distance = left_hash - right_hash
            similarity = 1 - (distance / self.HASH_BITS)
            return max(0.0, min(1.0, similarity))
        except Exception as exc:
            logger.warning("Failed to compare hash segments: %s", exc)
            return None

    def compare_hashes(self, query_hash: str, candidate_hash: str) -> Dict[str, Any]:
        """Compare combined perceptual hashes and classify near duplicates."""
        query = self._parse_combined_hash(query_hash)
        candidate = self._parse_combined_hash(candidate_hash)

        similarities = []
        per_component: Dict[str, float] = {}
        for key in ("p", "d", "a"):
            similarity = self._hash_similarity(query.get(key, ""), candidate.get(key, ""))
            if similarity is None:
                continue
            per_component[key] = similarity
            similarities.append(similarity)

        average_similarity = sum(similarities) / len(similarities) if similarities else 0.0
        is_exact = bool(query_hash and candidate_hash and query_hash == candidate_hash)
        is_near_duplicate = average_similarity >= self.NEAR_HASH_SIMILARITY

        return {
            "average_similarity": average_similarity,
            "component_similarity": per_component,
            "is_exact": is_exact or average_similarity >= self.EXACT_HASH_SIMILARITY,
            "is_near_duplicate": is_near_duplicate,
        }

    def analyze(self, image_bytes: bytes) -> Dict[str, Any]:
        """Run metadata and perceptual-hash analysis."""
        metadata_result = self.check_metadata(image_bytes)
        hash_result = self.compute_hashes(image_bytes)
        return {
            **metadata_result,
            **hash_result,
        }


image_forensics_service = ImageForensicsService()
