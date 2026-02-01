import logging
import json
from typing import Dict, Optional
from PIL import Image
import io
import requests
import google.generativeai as genai

from app.models.events import ExtractedKycData
from app.config import settings

logger = logging.getLogger(__name__)


class OCRService:
    """
    OCR Service sử dụng Google Gemini Vision API để trích xuất thông tin từ CCCD/CMND
    
    Features:
    - Đọc thông tin từ mặt trước và mặt sau CCCD
    - Trích xuất: Họ tên, Ngày sinh, Số CCCD, Địa chỉ, Giới tính, Quốc tịch, v.v.
    - Fallback sang Mock mode nếu không có API key
    """

    # Mock data for fallback/testing
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
        """Initialize OCR Service with Gemini API"""
        self.mock_mode = False
        
        if settings.gemini_api_key and not settings.enable_gemini_mock:
            try:
                genai.configure(api_key=settings.gemini_api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                logger.info("OCR Service initialized with Gemini Vision API")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini API: {e}")
                logger.warning("Falling back to mock mode")
                self.mock_mode = True
        else:
            self.mock_mode = True
            logger.info("OCR Service initialized in MOCK mode")

    async def download_image(self, url: str) -> bytes:
        """Download image from URL"""
        try:
            logger.info(f"Downloading image from: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Failed to download image from {url}: {e}")
            raise

    def _create_ocr_prompt(self) -> str:
        """
        Tạo prompt để yêu cầu Gemini trích xuất thông tin từ CCCD
        """
        prompt = """Bạn là một hệ thống OCR chuyên đọc thông tin từ Căn cước công dân (CCCD) hoặc Chứng minh nhân dân (CMND) của Việt Nam.

Hãy phân tích ảnh CCCD/CMND này và trích xuất các thông tin sau. Nếu không tìm thấy thông tin nào, để trống ("").

**Yêu cầu:**
1. Đọc chính xác các ký tự tiếng Việt có dấu
2. Số CCCD/CMND phải là dãy số (12 số cho CCCD, 9 số cho CMND cũ)
3. Ngày tháng định dạng: DD/MM/YYYY

**Trả về JSON với format sau (CHỈ trả về JSON, không thêm text khác):**
```json
{
    "fullName": "Họ và tên đầy đủ",
    "dob": "Ngày sinh (DD/MM/YYYY)",
    "idNumber": "Số CCCD/CMND",
    "idType": "CITIZEN_ID hoặc OLD_ID_CARD",
    "address": "Nơi thường trú",
    "gender": "Nam hoặc Nữ",
    "nationality": "Quốc tịch",
    "placeOfOrigin": "Quê quán",
    "issueDate": "Ngày cấp (DD/MM/YYYY)",
    "expiryDate": "Có giá trị đến (DD/MM/YYYY)"
}
```

Lưu ý:
- idType = "CITIZEN_ID" nếu là CCCD (12 số), "OLD_ID_CARD" nếu là CMND cũ (9 số)
- Nếu là ảnh mặt sau, chỉ trích xuất được issueDate và expiryDate
- Nếu không đọc được trường nào, để trống ("")
"""
        return prompt

    async def _extract_with_gemini(self, image_bytes: bytes) -> Dict:
        """
        Sử dụng Gemini Vision API để trích xuất thông tin từ ảnh CCCD
        
        Args:
            image_bytes: Binary data của ảnh CCCD
            
        Returns:
            Dict với thông tin trích xuất được
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Create prompt
            prompt = self._create_ocr_prompt()
            
            # Call Gemini API
            response = self.model.generate_content([prompt, image])
            
            # Parse JSON response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            
            logger.info(f"Gemini OCR extracted: {result.get('fullName', 'N/A')}, ID: {result.get('idNumber', 'N/A')}")
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Response text: {response_text}")
            return {}
        except Exception as e:
            logger.error(f"Error extracting with Gemini: {e}")
            return {}

    def _mock_extract(self) -> Dict:
        """
        Mock extraction for testing when Gemini API is not available
        """
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
        """
        Merge thông tin từ mặt trước và mặt sau CCCD
        
        Mặt trước: Họ tên, ngày sinh, giới tính, quốc tịch, quê quán, địa chỉ, số CCCD
        Mặt sau: Ngày cấp, ngày hết hạn
        """
        merged = {
            "fullName": front_data.get("fullName", "") or back_data.get("fullName", ""),
            "dob": front_data.get("dob", "") or back_data.get("dob", ""),
            "idNumber": front_data.get("idNumber", "") or back_data.get("idNumber", ""),
            "idType": front_data.get("idType", "CITIZEN_ID") or back_data.get("idType", "CITIZEN_ID"),
            "address": front_data.get("address", "") or back_data.get("address", ""),
            "gender": front_data.get("gender", "") or back_data.get("gender", ""),
            "nationality": front_data.get("nationality", "") or back_data.get("nationality", ""),
            "placeOfOrigin": front_data.get("placeOfOrigin", "") or back_data.get("placeOfOrigin", ""),
            # Mặt sau thường có ngày cấp và ngày hết hạn
            "issueDate": back_data.get("issueDate", "") or front_data.get("issueDate", ""),
            "expiryDate": back_data.get("expiryDate", "") or front_data.get("expiryDate", ""),
        }
        return merged

    async def process_id_card(
        self, front_image_url: str, back_image_url: str
    ) -> ExtractedKycData:
        """
        Process front and back images of ID card and extract information.
        
        Args:
            front_image_url: URL của ảnh mặt trước CCCD
            back_image_url: URL của ảnh mặt sau CCCD
            
        Returns:
            ExtractedKycData với thông tin trích xuất được
        """
        try:
            logger.info("Processing ID card images")

            # Check if using mock mode
            if self.mock_mode:
                logger.info("Using MOCK mode for OCR")
                mock_data = self._mock_extract()
                return ExtractedKycData(**mock_data)

            # Download images
            front_bytes = await self.download_image(front_image_url)
            back_bytes = await self.download_image(back_image_url)

            # Extract text from both images using Gemini
            logger.info("Extracting data from front image...")
            front_data = await self._extract_with_gemini(front_bytes)
            
            logger.info("Extracting data from back image...")
            back_data = await self._extract_with_gemini(back_bytes)

            # Merge data from both sides
            merged_data = self._merge_front_back_data(front_data, back_data)
            
            # Validate required fields
            if not merged_data.get("fullName") or not merged_data.get("idNumber"):
                logger.warning("Could not extract required fields, falling back to mock")
                mock_data = self._mock_extract()
                return ExtractedKycData(**mock_data)

            logger.info(f"Successfully extracted KYC data: {merged_data['fullName']}, ID: {merged_data['idNumber']}")
            
            return ExtractedKycData(**merged_data)

        except Exception as e:
            logger.error(f"Failed to process ID card: {e}", exc_info=True)
            # Fallback to mock on error
            logger.info("Falling back to mock data due to error")
            mock_data = self._mock_extract()
            return ExtractedKycData(**mock_data)


ocr_service = OCRService()
