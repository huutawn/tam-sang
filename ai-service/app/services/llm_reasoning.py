import asyncio
import json
import logging
from io import BytesIO
from typing import Any, Dict

import google.generativeai as genai
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
                genai.configure(api_key=settings.gemini_api_key)
                self.model = genai.GenerativeModel("gemini-flash-latest")
                self.mock_mode = False
                logger.info("Gemini API initialized successfully")
            except Exception as e:
                logger.error("Failed to initialize Gemini API: %s", e)
                logger.warning("Falling back to mock mode")
                self.mock_mode = True
        else:
            self.mock_mode = True
            logger.info("LLM Reasoning Service initialized in MOCK mode")

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

    def _normalize_detailed_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
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
            "serves_campaign_goal": bool(result.get("serves_campaign_goal", False)),
            "reasoning": str(result.get("reasoning", "")).strip(),
            "trust_score": max(0, min(100, int(self._to_float(result.get("trust_score", 0))))),
            "extraction_confidence": max(
                0.0,
                min(1.0, self._to_float(result.get("extraction_confidence", 0.0))),
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

Yeu cau:
1. Doc ten don vi/merchant tren hoa don.
2. Doc ngay hoa don.
3. Doc tong tien cuoi cung phai tra.
4. Liet ke tat ca mat hang voi:
   - name
   - quantity
   - unit_price
   - total_price
   - is_reasonable
5. Danh gia hoa don co phuc vu campaign_goal khong.
6. Danh gia muc do tu tin trich xuat extraction_confidence trong khoang 0..1.

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
  "serves_campaign_goal": true,
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

            image = Image.open(BytesIO(image_bytes))
            prompt = self._create_prompt(campaign_context, withdrawal_reason)
            loop = asyncio.get_event_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: self.model.generate_content([prompt, image]),
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

            image = Image.open(BytesIO(image_bytes))
            prompt = self._create_detailed_prompt(withdrawal_reason, campaign_goal)
            loop = asyncio.get_event_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: self.model.generate_content([prompt, image]),
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
                "serves_campaign_goal": False,
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
                "serves_campaign_goal": False,
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
                "serves_campaign_goal": False,
                "reasoning": f"Loi khi phan tich hoa don: {str(e)}",
                "trust_score": 0,
                "extraction_confidence": 0.0,
            }


llm_reasoning_service = LlmReasoningService()
