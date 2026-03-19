import asyncio
import json
import logging
import math
from io import BytesIO
from typing import Any, Dict

from google import genai
from google.genai import types
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)


class LlmReasoningService:
    """
    Vision-LLM service for invoice analysis.

    Day 2 goal:
    - return richer structured bill data
    - keep output shape stable for the local bill validator
    """

    def __init__(self):
        if settings.gemini_api_key and not settings.enable_gemini_mock:
            try:
                self.client = genai.Client(api_key=settings.gemini_api_key)
                self.model_name = "gemini-flash-latest"
                self.mock_mode = False
                logger.info("Gemini API initialized successfully")
            except Exception as e:
                logger.error("Failed to initialize Gemini API: %s", e)
                logger.warning("Falling back to mock mode")
                self.mock_mode = True
        else:
            self.mock_mode = True
            logger.info("LLM Reasoning Service initialized in MOCK mode")

    def _image_part_from_bytes(self, image_bytes: bytes) -> types.Part:
        with Image.open(BytesIO(image_bytes)) as image:
            mime_type = Image.MIME.get(image.format or "", "image/jpeg")
        return types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    def _image_part_from_pil_image(self, image: Image.Image) -> types.Part:
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=92, optimize=True)
        return types.Part.from_bytes(data=buffer.getvalue(), mime_type="image/jpeg")

    def _resize_image_for_gemini(self, image: Image.Image, max_side: int = 2200) -> Image.Image:
        width, height = image.size
        longest_side = max(width, height)
        if longest_side <= max_side:
            return image.copy()

        scale = max_side / float(longest_side)
        resized_width = max(1, int(round(width * scale)))
        resized_height = max(1, int(round(height * scale)))
        return image.resize((resized_width, resized_height), Image.Resampling.LANCZOS)

    def _detect_document_bounds(self, image: Image.Image) -> tuple[int, int, int, int] | None:
        grayscale = image.convert("L")
        binary = grayscale.point(lambda value: 255 if value >= 185 else 0)
        bounds = binary.getbbox()
        if not bounds:
            return None

        left, top, right, bottom = bounds
        image_width, image_height = image.size
        document_width = right - left
        document_height = bottom - top
        area_ratio = (document_width * document_height) / float(max(1, image_width * image_height))

        if area_ratio < 0.08 or document_height <= int(document_width * 1.1):
            return None

        margin_x = max(24, int(document_width * 0.06))
        margin_y = max(24, int(document_height * 0.03))
        return (
            max(0, left - margin_x),
            max(0, top - margin_y),
            min(image_width, right + margin_x),
            min(image_height, bottom + margin_y),
        )

    def _vertical_crop_positions(self, image_height: int, crop_height: int, max_crops: int = 3) -> list[int]:
        if image_height <= crop_height or max_crops <= 1:
            return [0]

        max_offset = image_height - crop_height
        if max_offset <= 0:
            return [0]

        crop_count = min(max_crops, max(2, math.ceil(image_height / float(crop_height))))
        positions = [int(round(max_offset * index / float(crop_count - 1))) for index in range(crop_count)]
        unique_positions: list[int] = []
        for position in positions:
            if position not in unique_positions:
                unique_positions.append(position)
        return unique_positions

    def _build_invoice_image_parts(self, image_bytes: bytes) -> list[types.Part]:
        with Image.open(BytesIO(image_bytes)) as source_image:
            image = source_image.convert("RGB")

        detected_bounds = self._detect_document_bounds(image)
        if detected_bounds:
            image = image.crop(detected_bounds)

        prepared_image = self._resize_image_for_gemini(image)
        parts = [self._image_part_from_pil_image(prepared_image)]

        width, height = prepared_image.size
        if width > 0 and height > int(width * 1.6):
            crop_height = min(height, max(int(width * 1.85), height // 2))
            for top in self._vertical_crop_positions(height, crop_height, max_crops=3):
                bottom = min(height, top + crop_height)
                cropped = prepared_image.crop((0, top, width, bottom))
                parts.append(self._image_part_from_pil_image(cropped))

        logger.info(
            "[Gemini] Prepared %s invoice view(s) (document_crop=%s size=%sx%s)",
            len(parts),
            bool(detected_bounds),
            width,
            height,
        )
        return parts

    def _build_invoice_contents(self, prompt: str, image_bytes: bytes) -> list[Any]:
        return [prompt, *self._build_invoice_image_parts(image_bytes)]

    def _extract_json_text(self, response_text: str) -> str:
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return cleaned.strip()

    def _to_float(self, value: Any) -> float:
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)

        text = str(value).strip()
        if not text:
            return 0.0
        text = text.replace("VND", "").replace("đ", "").replace(",", "").strip()
        try:
            return float(text)
        except ValueError:
            return 0.0

    def _to_optional_bool(self, value: Any) -> bool | None:
        if value is None:
            return None
        if isinstance(value, bool):
            return value

        normalized = str(value).strip().lower()
        if normalized in {"true", "1", "yes"}:
            return True
        if normalized in {"false", "0", "no"}:
            return False
        return None

    def _normalize_detailed_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        raw_trust_score = self._to_float(result.get("trust_score", 0))
        if 0 < raw_trust_score <= 1:
            raw_trust_score *= 100

        extraction_confidence = self._to_float(result.get("extraction_confidence", 0.0))
        if extraction_confidence > 1:
            extraction_confidence /= 100

        normalized_items = []
        for item in result.get("items", []) or []:
            normalized_items.append(
                {
                    "name": str(item.get("name", "")).strip(),
                    "quantity": self._to_float(item.get("quantity", 0)),
                    "unit_price": self._to_float(item.get("unit_price", 0)),
                    "total_price": self._to_float(item.get("total_price", 0)),
                    "is_reasonable": bool(item.get("is_reasonable", True)),
                }
            )

        return {
            "merchant_name": str(result.get("merchant_name", "")).strip(),
            "invoice_date": str(result.get("invoice_date", "")).strip(),
            "currency": str(result.get("currency", "VND")).strip() or "VND",
            "total_amount": self._to_float(result.get("total_amount", 0)),
            "items": normalized_items,
            "price_warnings": [str(x) for x in (result.get("price_warnings", []) or [])],
            "serves_campaign_goal": self._to_optional_bool(result.get("serves_campaign_goal")),
            "reasoning": str(result.get("reasoning", "")).strip(),
            "trust_score": max(0, min(100, int(round(raw_trust_score)))),
            "extraction_confidence": max(
                0.0,
                min(1.0, extraction_confidence),
            ),
        }

    def _create_prompt(self, campaign_context: str, withdrawal_reason: str) -> str:
        return f"""Ban la mot tham dinh vien tu thien chuyen nghiep.

Thong tin chien dich:
- campaign_context: {campaign_context}
- withdrawal_reason: {withdrawal_reason}

Hay doc hoa don va tra ve JSON:
{{
  "score": 0-100,
  "is_valid": true/false,
  "reasoning": "giai thich ngan gon bang tieng Viet"
}}

Chi tra ve JSON."""

    def _create_detailed_prompt(self, withdrawal_reason: str, campaign_goal: str) -> str:
        return f"""Ban la he thong trich xuat va tham dinh hoa don cho bai toan tu thien.

Can phan tich hoa don dua tren:
- withdrawal_reason: {withdrawal_reason}
- campaign_goal: {campaign_goal}

Ban se nhan 1 anh tong quan va co the them nhieu crop cua cung 1 hoa don.
Hay tong hop thong tin tu TAT CA cac anh:
- uu tien merchant + ngay o phan dau hoa don
- uu tien "Phai thanh toan" / "Tong thanh toan" o cuoi hoa don
- khong nham "Tien khach dua", "Tien thoi lai", ma QR hay chuong trinh khuyen mai thanh tong tien

Yeu cau:
1. Doc ten don vi/merchant tren hoa don.
2. Doc ngay hoa don.
3. Doc tong tien cuoi cung phai tra. Neu hoa don co so "da lam tron", chi chon so do khi khong tim thay muc "Phai thanh toan"/"Tong thanh toan" ro rang hon.
4. Liet ke tat ca mat hang voi:
   - name
   - quantity
   - unit_price
   - total_price
   - is_reasonable
5. Danh gia hoa don co phuc vu campaign_goal khong. Neu khong du du lieu de ket luan, tra ve null.
6. Danh gia muc do tu tin trich xuat extraction_confidence trong khoang 0..1.
7. Neu chi doc duoc mot phan, van tra ve cac truong doc duoc thay vi de rong tat ca.

Tra ve JSON dung format:
{{
  "merchant_name": "string",
  "invoice_date": "YYYY-MM-DD hoac DD/MM/YYYY neu doc duoc",
  "currency": "VND",
  "total_amount": 0,
  "items": [
    {{
      "name": "string",
      "quantity": 0,
      "unit_price": 0,
      "total_price": 0,
      "is_reasonable": true
    }}
  ],
  "price_warnings": ["string"],
  "serves_campaign_goal": true/false/null,
  "reasoning": "giai thich bang tieng Viet",
  "trust_score": 0,
  "extraction_confidence": 0.0
}}

Chi tra ve JSON."""

    def _mock_response(self, campaign_context: str, withdrawal_reason: str) -> Dict[str, Any]:
        reason_lower = withdrawal_reason.lower()
        if any(keyword in reason_lower for keyword in ["thuoc", "y te", "benh vien", "kham"]):
            return {
                "score": 85,
                "is_valid": True,
                "reasoning": "Hoa don mua thuoc va dich vu y te phu hop voi ly do rut tien.",
            }
        if any(keyword in reason_lower for keyword in ["hoc", "sach", "van phong pham"]):
            return {
                "score": 90,
                "is_valid": True,
                "reasoning": "Hoa don mua sach va van phong pham phu hop voi muc tieu giao duc.",
            }
        return {
            "score": 75,
            "is_valid": True,
            "reasoning": "Hoa don co cac muc hang tuong doi phu hop voi ly do rut tien.",
        }

    def _mock_detailed_response(self, withdrawal_reason: str, campaign_goal: str) -> Dict[str, Any]:
        reason_lower = withdrawal_reason.lower()

        if any(keyword in reason_lower for keyword in ["gao", "luong thuc", "thuc pham"]):
            result = {
                "merchant_name": "Sieu thi Bach Hoa Xanh",
                "invoice_date": "2026-03-14",
                "currency": "VND",
                "total_amount": 5900000,
                "items": [
                    {"name": "Gao te thom", "quantity": 100, "unit_price": 25000, "total_price": 2500000, "is_reasonable": True},
                    {"name": "Mi goi 3 Mien", "quantity": 200, "unit_price": 4000, "total_price": 800000, "is_reasonable": True},
                    {"name": "Nuoc mam", "quantity": 50, "unit_price": 25000, "total_price": 1250000, "is_reasonable": True},
                    {"name": "Dau an", "quantity": 30, "unit_price": 45000, "total_price": 1350000, "is_reasonable": True},
                ],
                "price_warnings": [],
                "serves_campaign_goal": True,
                "reasoning": "Hoa don mua nhu yeu pham phu hop voi muc tieu ho tro nguoi dan.",
                "trust_score": 90,
                "extraction_confidence": 0.93,
            }
            return self._normalize_detailed_result(result)

        if any(keyword in reason_lower for keyword in ["thuoc", "y te", "benh vien"]):
            result = {
                "merchant_name": "Nha thuoc Long Chau",
                "invoice_date": "2026-03-14",
                "currency": "VND",
                "total_amount": 2500000,
                "items": [
                    {"name": "Thuoc khang sinh", "quantity": 10, "unit_price": 150000, "total_price": 1500000, "is_reasonable": True},
                    {"name": "Thuoc ha sot", "quantity": 20, "unit_price": 20000, "total_price": 400000, "is_reasonable": True},
                    {"name": "Bang gac y te", "quantity": 50, "unit_price": 12000, "total_price": 600000, "is_reasonable": True},
                ],
                "price_warnings": [],
                "serves_campaign_goal": True,
                "reasoning": "Hoa don mua thuoc va vat tu y te, gia tri hop ly theo muc tieu ho tro y te.",
                "trust_score": 88,
                "extraction_confidence": 0.9,
            }
            return self._normalize_detailed_result(result)

        result = {
            "merchant_name": "Cua hang tong hop",
            "invoice_date": "2026-03-14",
            "currency": "VND",
            "total_amount": 2000000,
            "items": [
                {"name": "Mat hang 1", "quantity": 10, "unit_price": 100000, "total_price": 1000000, "is_reasonable": True},
                {"name": "Mat hang 2", "quantity": 10, "unit_price": 100000, "total_price": 1000000, "is_reasonable": True},
            ],
            "price_warnings": [],
            "serves_campaign_goal": True,
            "reasoning": "Mock analysis cho hoa don tong hop.",
            "trust_score": 75,
            "extraction_confidence": 0.75,
        }
        return self._normalize_detailed_result(result)

    async def analyze_invoice(
        self,
        image_bytes: bytes,
        campaign_context: str,
        withdrawal_reason: str,
    ) -> Dict[str, Any]:
        try:
            if self.mock_mode:
                logger.info("Analyzing invoice (MOCK) - Reason: %s", withdrawal_reason)
                return self._mock_response(campaign_context, withdrawal_reason)

            prompt = self._create_prompt(campaign_context, withdrawal_reason)
            response = await asyncio.wait_for(
                self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=self._build_invoice_contents(prompt, image_bytes),
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    ),
                ),
                timeout=60,
            )
            response_text = self._extract_json_text(response.text)
            result = json.loads(response_text)
            return result
        except asyncio.TimeoutError:
            logger.error("[Gemini] API call timed out after 60 seconds")
            return {
                "score": 0,
                "is_valid": False,
                "reasoning": "Gemini API bi timeout sau 60 giay.",
            }
        except Exception as e:
            logger.error("[Gemini] Error analyzing invoice: %s", e)
            return {
                "score": 0,
                "is_valid": False,
                "reasoning": f"Loi khi phan tich hoa don: {str(e)}",
            }

    async def analyze_invoice_detailed(
        self,
        image_bytes: bytes,
        withdrawal_reason: str,
        campaign_goal: str,
    ) -> Dict[str, Any]:
        try:
            if self.mock_mode:
                logger.info("Detailed analysis (MOCK) - Reason: %s", withdrawal_reason)
                return self._mock_detailed_response(withdrawal_reason, campaign_goal)

            prompt = self._create_detailed_prompt(withdrawal_reason, campaign_goal)
            response = await asyncio.wait_for(
                self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=self._build_invoice_contents(prompt, image_bytes),
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    ),
                ),
                timeout=60,
            )
            response_text = self._extract_json_text(response.text)
            result = json.loads(response_text)
            normalized = self._normalize_detailed_result(result)

            logger.info(
                "[Gemini-Detailed] Analysis complete - merchant=%s total=%s items=%s score=%s confidence=%.2f",
                normalized.get("merchant_name", ""),
                normalized.get("total_amount", 0),
                len(normalized.get("items", [])),
                normalized.get("trust_score", 0),
                normalized.get("extraction_confidence", 0.0),
            )
            return normalized
        except asyncio.TimeoutError:
            logger.error("[Gemini-Detailed] API call timed out after 60 seconds")
            return {
                "merchant_name": "",
                "invoice_date": "",
                "currency": "VND",
                "total_amount": 0,
                "items": [],
                "price_warnings": ["Gemini API timeout"],
                "serves_campaign_goal": None,
                "reasoning": "Gemini API bi timeout sau 60 giay.",
                "trust_score": 0,
                "extraction_confidence": 0.0,
            }
        except json.JSONDecodeError as e:
            logger.error("[Gemini-Detailed] Failed to parse response: %s", e)
            return {
                "merchant_name": "",
                "invoice_date": "",
                "currency": "VND",
                "total_amount": 0,
                "items": [],
                "price_warnings": ["Loi parse response tu Gemini"],
                "serves_campaign_goal": None,
                "reasoning": "Loi parse response tu Gemini API.",
                "trust_score": 30,
                "extraction_confidence": 0.0,
            }
        except Exception as e:
            logger.error("[Gemini-Detailed] Error in analysis: %s", e)
            return {
                "merchant_name": "",
                "invoice_date": "",
                "currency": "VND",
                "total_amount": 0,
                "items": [],
                "price_warnings": [f"Loi: {str(e)}"],
                "serves_campaign_goal": None,
                "reasoning": f"Loi khi phan tich hoa don: {str(e)}",
                "trust_score": 0,
                "extraction_confidence": 0.0,
            }


llm_reasoning_service = LlmReasoningService()
