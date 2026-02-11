"""
OCR Service — PaddleOCR-based ID card text extraction.

Extracts structured identity information (name, DOB, ID number, etc.)
from Vietnamese CCCD / CMND images using PaddleOCR with regex-based
post-processing.

Architecture notes:
    - PaddleOCR runs locally; no external API dependency.
    - Uses httpx for async image downloads (non-blocking).
    - Falls back to mock data ONLY in mock_mode (PaddleOCR init failure).
"""

import logging
import re
import io
from typing import Dict, List

import httpx
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR  # type: ignore

from app.models.events import ExtractedKycData
from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# HTTP client settings for image download
# ---------------------------------------------------------------------------
_HTTP_TIMEOUT = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=5.0)


class OCRService:
    """
    OCR Service using PaddleOCR for Vietnamese ID card data extraction.

    Capabilities:
        - Reads front and back of CCCD/CMND
        - No Gemini / external API dependency
        - Fallback mock when PaddleOCR init fails
    """

    MOCK_NAMES = [
        "NGUYEN VAN A",
        "TRAN THI B",
        "LE VAN C",
        "PHAM THI D",
        "HOANG VAN E",
    ]

    MOCK_ADDRESSES = [
        "123 Nguyen Hue Street, District 1, Ho Chi Minh City",
        "456 Le Loi Street, District 3, Ho Chi Minh City",
        "789 Tran Hung Dao Street, District 5, Ho Chi Minh City",
    ]

    def __init__(self) -> None:
        self.mock_mode = False

        try:
            # PaddleOCR general model — lang="en" reads Latin + digits well.
            # Switch to lang="vi" if a Vietnamese-specific model is available.
            self.ocr = PaddleOCR(use_angle_cls=True, lang="en")
            logger.info("OCR Service initialized with PaddleOCR")
        except Exception as e:
            logger.error("Failed to initialize PaddleOCR: %s", e)
            logger.warning("Falling back to mock mode")
            self.mock_mode = True

    # ------------------------------------------------------------------
    # Image download (async, non-blocking)
    # ------------------------------------------------------------------

    async def download_image(self, url: str) -> bytes:
        """
        Download image from URL using async httpx.

        Args:
            url: Fully-qualified image URL.

        Returns:
            Raw image bytes.

        Raises:
            httpx.HTTPStatusError: On non-2xx response.
            httpx.TimeoutException: On timeout.
        """
        try:
            logger.info("Downloading image from: %s", url)
            async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
                response = await client.get(url)
                response.raise_for_status()
            return response.content
        except httpx.HTTPStatusError as e:
            logger.error(
                "HTTP %s error downloading image from %s: %s",
                e.response.status_code, url, e,
            )
            raise
        except Exception as e:
            logger.error("Failed to download image from %s: %s", url, e)
            raise

    # ------------------------------------------------------------------
    # Core OCR + Parse
    # ------------------------------------------------------------------

    def _run_paddle_ocr(self, image_bytes: bytes) -> List[str]:
        """Run PaddleOCR and return a list of detected text lines."""
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_np = np.array(image)
            result = self.ocr.ocr(img_np, cls=True)
            texts: List[str] = []
            if result and result[0]:
                for line in result[0]:
                    text = line[1][0]
                    texts.append(text)
            logger.info("OCR raw lines: %s", texts)
            return texts
        except Exception as e:
            logger.error("Error running PaddleOCR: %s", e, exc_info=True)
            return []

    def _parse_id_card_texts(self, texts: List[str]) -> Dict:
        """
        Parse OCR text lines into structured ID card fields.

        Uses regex + heuristic matching — sufficient for CCCD/CMND demo,
        but not production-grade for all edge cases.
        """
        full_text = "\n".join(texts)
        upper_lines = [t.strip() for t in texts if t.strip().isupper()]

        # fullName: longest UPPER line, excluding header text
        name = ""
        for line in upper_lines:
            if ("CAN CUOC" in line) or ("CONG DAN" in line):
                continue
            if len(line.split()) >= 2:
                name = line
                break

        # idNumber: prefer 12-digit (CCCD), fallback 9-digit (CMND)
        id12 = re.search(r"\b\d{12}\b", full_text)
        id9 = re.search(r"\b\d{9}\b", full_text)
        id_number = id12.group(0) if id12 else (id9.group(0) if id9 else "")

        if id12:
            id_type = "CITIZEN_ID"
        elif id9:
            id_type = "OLD_ID_CARD"
        else:
            id_type = ""

        # dob (DD/MM/YYYY or DD-MM-YYYY)
        dob_match = re.search(
            r"(\d{2}[/-]\d{2}[/-]\d{4})", full_text, flags=re.IGNORECASE
        )
        dob = dob_match.group(1).replace("-", "/") if dob_match else ""

        # issueDate & expiryDate (keyword-based)
        issue_match = re.search(
            r"(NGAY CAP|Ngày cấp|Issue Date)[:\s]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})",
            full_text,
            flags=re.IGNORECASE,
        )
        issue_date = (
            issue_match.group(2).replace("-", "/") if issue_match else ""
        )

        expiry_match = re.search(
            r"(CO GIA TRI DEN|Có giá trị đến|Expiry Date)[:\s]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})",
            full_text,
            flags=re.IGNORECASE,
        )
        expiry_date = (
            expiry_match.group(2).replace("-", "/") if expiry_match else ""
        )

        # address & placeOfOrigin
        address = ""
        place_of_origin = ""

        for line in texts:
            upper = line.upper()
            if ("THUONG TRU" in upper) or ("THƯỜNG TRÚ" in upper) or ("NOI CU TRU" in upper):
                address = line
            if ("QUE QUAN" in upper) or ("QUÊ QUÁN" in upper) or ("NGUYEN QUAN" in upper):
                place_of_origin = line

        # Gender
        gender = ""
        if re.search(r"\bNAM\b", full_text, flags=re.IGNORECASE):
            gender = "Nam"
        elif re.search(r"\bNU\b|\bNỮ\b", full_text, flags=re.IGNORECASE):
            gender = "Nữ"

        # Nationality
        nationality = ""
        if "VIET NAM" in full_text.upper() or "VIỆT NAM" in full_text.upper():
            nationality = "Việt Nam"

        parsed = {
            "fullName": name,
            "dob": dob,
            "idNumber": id_number,
            "idType": id_type,
            "address": address,
            "gender": gender,
            "nationality": nationality,
            "placeOfOrigin": place_of_origin,
            "issueDate": issue_date,
            "expiryDate": expiry_date,
        }

        logger.info("Parsed ID card fields: %s", parsed)
        return parsed

    def _mock_extract(self) -> Dict:
        """Generate mock KYC data for development/testing."""
        import random

        return {
            "fullName": random.choice(self.MOCK_NAMES),
            "dob": f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/{random.randint(1970, 2000)}",
            "idNumber": f"{random.randint(100000000000, 999999999999)}",
            "idType": "CITIZEN_ID",
            "address": random.choice(self.MOCK_ADDRESSES),
            "gender": random.choice(["Nam", "Nữ"]),
            "nationality": "Việt Nam",
            "placeOfOrigin": "Hà Nội",
            "issueDate": f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/2020",
            "expiryDate": f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/2045",
        }

    def _merge_front_back_data(self, front_data: Dict, back_data: Dict) -> Dict:
        """Merge OCR results from front and back images, preferring non-empty values."""
        merged = {
            "fullName": front_data.get("fullName", "") or back_data.get("fullName", ""),
            "dob": front_data.get("dob", "") or back_data.get("dob", ""),
            "idNumber": front_data.get("idNumber", "") or back_data.get("idNumber", ""),
            "idType": front_data.get("idType", "CITIZEN_ID")
            or back_data.get("idType", "CITIZEN_ID"),
            "address": front_data.get("address", "") or back_data.get("address", ""),
            "gender": front_data.get("gender", "") or back_data.get("gender", ""),
            "nationality": front_data.get("nationality", "")
            or back_data.get("nationality", ""),
            "placeOfOrigin": front_data.get("placeOfOrigin", "")
            or back_data.get("placeOfOrigin", ""),
            "issueDate": back_data.get("issueDate", "")
            or front_data.get("issueDate", ""),
            "expiryDate": back_data.get("expiryDate", "")
            or front_data.get("expiryDate", ""),
        }
        return merged

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def process_id_card(
        self, front_image_url: str, back_image_url: str
    ) -> ExtractedKycData:
        """
        Extract identity data from front and back ID card images.

        Args:
            front_image_url: URL of the front-side image.
            back_image_url: URL of the back-side image.

        Returns:
            ExtractedKycData with parsed fields.

        Raises:
            RuntimeError: If OCR cannot extract required fields (fullName, idNumber).
        """
        try:
            logger.info("Processing ID card images (PaddleOCR)")

            if self.mock_mode:
                logger.info("Using MOCK mode for OCR")
                return ExtractedKycData(**self._mock_extract())

            front_bytes = await self.download_image(front_image_url)
            back_bytes = await self.download_image(back_image_url)

            # OCR front
            logger.info("Running OCR for front image...")
            front_texts = self._run_paddle_ocr(front_bytes)
            front_data = self._parse_id_card_texts(front_texts)

            # OCR back
            logger.info("Running OCR for back image...")
            back_texts = self._run_paddle_ocr(back_bytes)
            back_data = self._parse_id_card_texts(back_texts)

            merged_data = self._merge_front_back_data(front_data, back_data)

            if not merged_data.get("fullName") or not merged_data.get("idNumber"):
                logger.error(
                    "OCR failed to extract required fields — fullName: '%s', idNumber: '%s'",
                    merged_data.get("fullName", ""),
                    merged_data.get("idNumber", ""),
                )
                raise RuntimeError(
                    "OCR không thể trích xuất trường bắt buộc (Họ tên / Số CCCD). "
                    "Vui lòng chụp ảnh rõ hơn và thử lại."
                )

            logger.info(
                "Successfully extracted KYC data (PaddleOCR): %s, ID: %s",
                merged_data["fullName"], merged_data["idNumber"],
            )
            return ExtractedKycData(**merged_data)

        except RuntimeError:
            # Re-raise RuntimeError (our own validation error) as-is.
            raise
        except Exception as e:
            logger.error("Failed to process ID card: %s", e, exc_info=True)
            raise RuntimeError(
                f"Lỗi xử lý OCR ảnh CCCD: {str(e)}"
            ) from e


ocr_service = OCRService()
