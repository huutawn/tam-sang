import logging
import json
from typing import Dict
import google.generativeai as genai
from io import BytesIO
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)


class LlmReasoningService:
    """
    Service sử dụng Gemini API để phân tích hóa đơn
    
    Chức năng:
    - Verify xem items trong hóa đơn có khớp với "Lý do rút tiền" và "Campaign context" không
    - Trả về score (0-100), is_valid (boolean), và reasoning (string)
    """
    
    def __init__(self):
        """Initialize Gemini API client"""
        if settings.gemini_api_key and not settings.enable_gemini_mock:
            try:
                genai.configure(api_key=settings.gemini_api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                self.mock_mode = False
                logger.info("Gemini API initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini API: {e}")
                logger.warning("Falling back to mock mode")
                self.mock_mode = True
        else:
            self.mock_mode = True
            logger.info("LLM Reasoning Service initialized in MOCK mode")
    
    def _create_prompt(self, campaign_context: str, withdrawal_reason: str) -> str:
        """
        Tạo prompt cho Gemini API
        
        Args:
            campaign_context: Bối cảnh chiến dịch từ thiện
            withdrawal_reason: Lý do rút tiền
            
        Returns:
            Prompt string
        """
        prompt = f"""Bạn là một thẩm định viên từ thiện chuyên nghiệp. Nhiệm vụ của bạn là phân tích hóa đơn và xác định xem nó có phù hợp với mục đích rút tiền từ quỹ từ thiện không.

**Thông tin chiến dịch:**
- Bối cảnh chiến dịch: {campaign_context}
- Lý do rút tiền được khai báo: {withdrawal_reason}

**Yêu cầu phân tích:**
1. Đọc và trích xuất các mục hàng/dịch vụ trong hóa đơn
2. So sánh các mục này với "Lý do rút tiền" đã khai báo
3. Đánh giá mức độ phù hợp với bối cảnh chiến dịch

**Hãy trả về kết quả dưới dạng JSON với format sau:**
{{
    "score": <số từ 0-100, 100 = hoàn toàn phù hợp>,
    "is_valid": <true nếu score >= 70, false nếu không>,
    "reasoning": "<giải thích chi tiết bằng tiếng Việt về lý do đánh giá, những mục nào phù hợp, những mục nào không phù hợp>"
}}

Chỉ trả về JSON, không thêm text nào khác."""
        
        return prompt
    
    def _mock_response(self, campaign_context: str, withdrawal_reason: str) -> Dict:
        """
        Mock response để testing khi không có API key
        
        Returns:
            Mock analysis result
        """
        logger.info("Generating mock LLM response")
        
        # Simple keyword matching để tạo mock response realistic
        reason_lower = withdrawal_reason.lower()
        
        if any(keyword in reason_lower for keyword in ["thuốc", "y tế", "bệnh viện", "khám"]):
            return {
                "score": 85,
                "is_valid": True,
                "reasoning": "Hóa đơn mua thuốc và dịch vụ y tế phù hợp với lý do rút tiền. Các mục trong hóa đơn bao gồm thuốc điều trị và chi phí khám bệnh, hoàn toàn hợp lệ với mục đích từ thiện y tế."
            }
        elif any(keyword in reason_lower for keyword in ["học", "sách", "văn phòng phẩm"]):
            return {
                "score": 90,
                "is_valid": True,
                "reasoning": "Hóa đơn mua sách và văn phòng phẩm phù hợp hoàn toàn với lý do hỗ trợ học tập. Tất cả các mục đều liên quan đến giáo dục."
            }
        elif any(keyword in reason_lower for keyword in ["thực phẩm", "gạo", "ăn", "lương thực"]):
            return {
                "score": 88,
                "is_valid": True,
                "reasoning": "Hóa đơn mua thực phẩm và lương thực phù hợp với mục đích hỗ trợ sinh hoạt. Các mặt hàng đều là nhu yếu phẩm thiết yếu."
            }
        else:
            return {
                "score": 75,
                "is_valid": True,
                "reasoning": "Hóa đơn được xác nhận có các mục hàng phù hợp với lý do rút tiền đã khai báo. Mock analysis cho mục đích testing."
            }
    
    async def analyze_invoice(
        self, 
        image_bytes: bytes, 
        campaign_context: str, 
        withdrawal_reason: str
    ) -> Dict:
        """
        Phân tích hóa đơn sử dụng Gemini API
        
        Args:
            image_bytes: Binary data của ảnh hóa đơn
            campaign_context: Bối cảnh chiến dịch từ thiện
            withdrawal_reason: Lý do rút tiền
            
        Returns:
            Dict với keys:
            - score: int (0-100)
            - is_valid: bool
            - reasoning: str
        """
        try:
            # Mock mode
            if self.mock_mode:
                logger.info(f"Analyzing invoice (MOCK) - Reason: {withdrawal_reason}")
                return self._mock_response(campaign_context, withdrawal_reason)
            
            # Real Gemini API call
            logger.info(f"Analyzing invoice with Gemini API - Reason: {withdrawal_reason}")
            
            # Convert bytes to PIL Image
            image = Image.open(BytesIO(image_bytes))
            
            # Create prompt
            prompt = self._create_prompt(campaign_context, withdrawal_reason)
            
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
            
            logger.info(f"Gemini analysis complete - Score: {result['score']}, Valid: {result['is_valid']}")
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Response text: {response_text}")
            return {
                "score": 50,
                "is_valid": False,
                "reasoning": "Lỗi parse response từ Gemini API. Vui lòng kiểm tra lại."
            }
        except Exception as e:
            logger.error(f"Error analyzing invoice with Gemini: {e}")
            return {
                "score": 0,
                "is_valid": False,
                "reasoning": f"Lỗi khi phân tích hóa đơn: {str(e)}"
            }


# Singleton instance
llm_reasoning_service = LlmReasoningService()
