import logging
import re
import io
from typing import Dict, List

import requests
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR  # type: ignore

from app.models.events import ExtractedKycData
from app.config import settings

logger = logging.getLogger(__name__)


class OCRService:
    """
    OCR Service sử dụng PaddleOCR để trích xuất thông tin từ CCCD/CMND Việt Nam.

    - Đọc được mặt trước / mặt sau
    - Không phụ thuộc Gemini / API bên ngoài
    - Fallback mock khi lỗi
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

    def __init__(self):
        self.mock_mode = False

        try:
            # Dùng model general của PaddleOCR, đủ cho demo CCCD
            # lang="en" vẫn đọc tốt chữ Latin + số; nếu bạn đã build model vi thì đổi lang="vi"
            self.ocr = PaddleOCR(use_angle_cls=True, lang="en")  # or "vi" nếu có.[web:86]
            logger.info("OCR Service initialized with PaddleOCR")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}")
            logger.warning("Falling back to mock mode")
            self.mock_mode = True

    async def download_image(self, url: str) -> bytes:
        """Download image from URL (giữ y như cũ)."""
        try:
            logger.info(f"Downloading image from: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Failed to download image from {url}: {e}")
            raise

    # ---------- CORE OCR + PARSE ----------

    def _run_paddle_ocr(self, image_bytes: bytes) -> List[str]:
        """Chạy PaddleOCR và trả về list dòng text."""
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_np = np.array(image)
            result = self.ocr.ocr(img_np, cls=True)
            texts: List[str] = []
            if result and result[0]:
                for line in result[0]:
                    text = line[1][0]
                    texts.append(text)
            logger.info(f"OCR raw lines: {texts}")
            return texts
        except Exception as e:
            logger.error(f"Error running PaddleOCR: {e}", exc_info=True)
            return []

    def _parse_id_card_texts(self, texts: List[str]) -> Dict:
        """
        Parse các dòng text OCR được thành dict thông tin CCCD/CMND.
        Dùng regex + heuristic, không hoàn hảo nhưng đủ cho demo.
        """
        full_text = "\n".join(texts)
        upper_lines = [t.strip() for t in texts if t.strip().isupper()]

        # fullName: lấy dòng UPPER dài nhất, loại mấy từ "CAN CUOC CONG DAN"
        name = ""
        for line in upper_lines:
            if ("CAN CUOC" in line) or ("CONG DAN" in line):
                continue
            if len(line.split()) >= 2:
                name = line
                break

        # idNumber: ưu tiên 12 số (CCCD), fallback 9 số (CMND)
        id12 = re.search(r"\b\d{12}\b", full_text)
        id9 = re.search(r"\b\d{9}\b", full_text)
        id_number = id12.group(0) if id12 else (id9.group(0) if id9 else "")

        if id12:
            id_type = "CITIZEN_ID"
        elif id9:
            id_type = "OLD_ID_CARD"
        else:
            id_type = ""

        # dob (Ngày sinh DD/MM/YYYY hoặc DD-MM-YYYY)
        dob_match = re.search(
            r"(\d{2}[/-]\d{2}[/-]\d{4})", full_text, flags=re.IGNORECASE
        )
        dob = dob_match.group(1).replace("-", "/") if dob_match else ""

        # issueDate & expiryDate (dùng từ khóa)
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

        # address & placeOfOrigin: rất phụ thuộc layout CCCD; đây là heuristic đơn giản
        address = ""
        place_of_origin = ""

        # Tìm dòng chứa từ khóa
        for line in texts:
            l = line.upper()
            if ("THUONG TRU" in l) or ("THƯỜNG TRÚ" in l) or ("NOI CU TRU" in l):
                address = line
            if ("QUE QUAN" in l) or ("QUÊ QUÁN" in l) or ("NGUYEN QUAN" in l):
                place_of_origin = line

        # Giới tính
        gender = ""
        if re.search(r"\bNAM\b", full_text, flags=re.IGNORECASE):
            gender = "Nam"
        elif re.search(r"\bNU\b|\bNỮ\b", full_text, flags=re.IGNORECASE):
            gender = "Nữ"

        # Quốc tịch
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

        logger.info(f"Parsed ID card fields: {parsed}")
        return parsed

    def _mock_extract(self) -> Dict:
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

    # ---------- PUBLIC API ----------

    async def process_id_card(
        self, front_image_url: str, back_image_url: str
    ) -> ExtractedKycData:
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
                logger.warning("Could not extract required fields, falling back to mock")
                return ExtractedKycData(**self._mock_extract())

            logger.info(
                f"Successfully extracted KYC data (PaddleOCR): "
                f"{merged_data['fullName']}, ID: {merged_data['idNumber']}"
            )
            return ExtractedKycData(**merged_data)

        except Exception as e:
            logger.error(f"Failed to process ID card: {e}", exc_info=True)
            logger.info("Falling back to mock data due to error")
            return ExtractedKycData(**self._mock_extract())


ocr_service = OCRService()
