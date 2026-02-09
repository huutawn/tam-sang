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
    
    def _create_detailed_prompt(self, withdrawal_reason: str, campaign_goal: str) -> str:
        """
        Create enhanced prompt for detailed invoice analysis
        
        Includes:
        - Item extraction with prices
        - Price reasonability checks
        - Campaign goal alignment
        """
        return f"""Bạn là một thẩm định viên từ thiện chuyên nghiệp. Phân tích hóa đơn dựa trên lý do: '{withdrawal_reason}'.

**Nhiệm vụ chi tiết:**
1. Trích xuất TỔNG TIỀN trên hóa đơn (số tiền cuối cùng phải trả)
2. Liệt kê TẤT CẢ hàng hóa/dịch vụ với:
   - Tên mặt hàng
   - Số lượng
   - Đơn giá
   - Thành tiền
3. Kiểm tra tính HỢP LÝ của đơn giá theo tiêu chuẩn thị trường Việt Nam:
   - Gạo: không quá 50.000đ/kg (cảnh báo nếu > 50.000đ)
   - Mì gói: không quá 10.000đ/gói (cảnh báo nếu > 10.000đ)
   - Nước mắm: không quá 100.000đ/chai 500ml (cảnh báo)
   - Dầu ăn: không quá 80.000đ/lít (cảnh báo)
   - Đường: không quá 30.000đ/kg (cảnh báo)
   - Các mặt hàng thiết yếu khác: đánh giá theo thị trường
4. Đánh giá xem hóa đơn có PHỤC VỤ mục tiêu chiến dịch '{campaign_goal}' không

**Trả về JSON với format chính xác sau:**
{{
    "total_amount": <số tiền tổng, kiểu số>,
    "items": [
        {{
            "name": "<tên mặt hàng>",
            "quantity": <số lượng, kiểu số>,
            "unit_price": <đơn giá, kiểu số>,
            "total_price": <thành tiền, kiểu số>,
            "is_reasonable": <true nếu đơn giá hợp lý, false nếu không>
        }}
    ],
    "price_warnings": ["<danh sách cảnh báo đơn giá bất thường>"],
    "serves_campaign_goal": <true nếu phù hợp mục tiêu, false nếu không>,
    "reasoning": "<giải thích chi tiết bằng tiếng Việt>",
    "trust_score": <điểm tin cậy 0-100>
}}

CHỈ trả về JSON, không thêm text nào khác."""
    
    def _mock_detailed_response(self, withdrawal_reason: str, campaign_goal: str) -> Dict:
        """Mock response for detailed invoice analysis"""
        logger.info("Generating mock detailed LLM response")
        
        reason_lower = withdrawal_reason.lower()
        
        if any(keyword in reason_lower for keyword in ["gạo", "lương thực", "thực phẩm"]):
            return {
                "total_amount": 5000000,
                "items": [
                    {"name": "Gạo tẻ thơm", "quantity": 100, "unit_price": 25000, "total_price": 2500000, "is_reasonable": True},
                    {"name": "Mì gói 3 Miền", "quantity": 200, "unit_price": 4000, "total_price": 800000, "is_reasonable": True},
                    {"name": "Nước mắm Nam Ngư", "quantity": 50, "unit_price": 25000, "total_price": 1250000, "is_reasonable": True},
                    {"name": "Dầu ăn Tường An", "quantity": 30, "unit_price": 45000, "total_price": 1350000, "is_reasonable": True}
                ],
                "price_warnings": [],
                "serves_campaign_goal": True,
                "reasoning": "Hóa đơn mua thực phẩm và nhu yếu phẩm với đơn giá hợp lý theo thị trường. Tất cả mặt hàng đều phù hợp với mục tiêu hỗ trợ người dân.",
                "trust_score": 90
            }
        elif any(keyword in reason_lower for keyword in ["thuốc", "y tế", "bệnh viện"]):
            return {
                "total_amount": 3500000,
                "items": [
                    {"name": "Thuốc kháng sinh", "quantity": 10, "unit_price": 150000, "total_price": 1500000, "is_reasonable": True},
                    {"name": "Thuốc hạ sốt Paracetamol", "quantity": 20, "unit_price": 20000, "total_price": 400000, "is_reasonable": True},
                    {"name": "Bông băng y tế", "quantity": 50, "unit_price": 12000, "total_price": 600000, "is_reasonable": True}
                ],
                "price_warnings": [],
                "serves_campaign_goal": True,
                "reasoning": "Hóa đơn mua thuốc và vật tư y tế với giá thị trường. Phù hợp với mục tiêu hỗ trợ y tế.",
                "trust_score": 88
            }
        else:
            return {
                "total_amount": 2000000,
                "items": [
                    {"name": "Mặt hàng 1", "quantity": 10, "unit_price": 100000, "total_price": 1000000, "is_reasonable": True},
                    {"name": "Mặt hàng 2", "quantity": 10, "unit_price": 100000, "total_price": 1000000, "is_reasonable": True}
                ],
                "price_warnings": [],
                "serves_campaign_goal": True,
                "reasoning": "Mock analysis - Hóa đơn được xác nhận phù hợp với lý do rút tiền.",
                "trust_score": 75
            }
    
    async def analyze_invoice_detailed(
        self,
        image_bytes: bytes,
        withdrawal_reason: str,
        campaign_goal: str
    ) -> Dict:
        """
        Phân tích hóa đơn chi tiết với Gemini
        
        Enhanced version với:
        - Trích xuất items + prices
        - Kiểm tra đơn giá hợp lý
        - Đánh giá phù hợp campaign goal
        
        Args:
            image_bytes: Binary data của ảnh hóa đơn
            withdrawal_reason: Lý do rút tiền
            campaign_goal: Mục tiêu chiến dịch
            
        Returns:
            Dict với full analysis results
        """
        try:
            # Mock mode
            if self.mock_mode:
                logger.info(f"Detailed analysis (MOCK) - Reason: {withdrawal_reason}")
                return self._mock_detailed_response(withdrawal_reason, campaign_goal)
            
            # Real Gemini API call
            logger.info(f"Detailed invoice analysis with Gemini - Reason: {withdrawal_reason}")
            
            # Convert bytes to PIL Image
            image = Image.open(BytesIO(image_bytes))
            
            # Create enhanced prompt
            prompt = self._create_detailed_prompt(withdrawal_reason, campaign_goal)
            
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
            
            logger.info(
                f"Detailed Gemini analysis complete - "
                f"Total: {result.get('total_amount', 0):,.0f}đ, "
                f"Items: {len(result.get('items', []))}, "
                f"Score: {result.get('trust_score', 0)}"
            )
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse detailed Gemini response: {e}")
            return {
                "total_amount": 0,
                "items": [],
                "price_warnings": ["Lỗi parse response từ Gemini"],
                "serves_campaign_goal": False,
                "reasoning": "Lỗi parse response từ Gemini API.",
                "trust_score": 30
            }
        except Exception as e:
            logger.error(f"Error in detailed invoice analysis: {e}")
            return {
                "total_amount": 0,
                "items": [],
                "price_warnings": [f"Lỗi: {str(e)}"],
                "serves_campaign_goal": False,
                "reasoning": f"Lỗi khi phân tích hóa đơn: {str(e)}",
                "trust_score": 0
            }


# Singleton instance
llm_reasoning_service = LlmReasoningService()
