"""
Pydantic models for Hybrid Reasoning events

Defines request/response structures for the hybrid embedding & cross-modal retrieval system.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from uuid import UUID
import hashlib
import json


class HybridReasoningRequest(BaseModel):
    """
    Request payload for hybrid reasoning
    
    Sent from Core-service when a withdrawal proof needs verification.
    """
    proof_id: str = Field(..., description="ID của proof cần xác thực")
    campaign_id: str = Field(..., description="ID của chiến dịch")
    list_bill_image_url: List[str] = Field(
        default_factory=list, 
        alias="listBillImageUrl",
        description="Danh sách URL ảnh hóa đơn"
    )
    list_image_url: List[str] = Field(
        default_factory=list,
        alias="listImageUrl", 
        description="Danh sách URL ảnh hiện trường"
    )
    withdrawal_reason: str = Field(..., description="Lý do rút tiền")
    campaign_goal: str = Field(..., description="Mục tiêu chiến dịch")
    timestamp: datetime = None
    
    class Config:
        populate_by_name = True
    
    def __init__(self, **data):
        if 'timestamp' not in data or data['timestamp'] is None:
            data['timestamp'] = datetime.now()
        super().__init__(**data)


class BillItem(BaseModel):
    """Single item extracted from a bill"""
    name: str = Field(..., description="Tên hàng hóa")
    quantity: float = Field(default=1.0, description="Số lượng")
    unit_price: float = Field(default=0.0, description="Đơn giá")
    total_price: float = Field(default=0.0, description="Thành tiền")
    is_reasonable: bool = Field(default=True, description="Đơn giá hợp lý không")


class GeminiAnalysisResult(BaseModel):
    """Result from Gemini bill analysis"""
    total_amount: float = Field(default=0.0, description="Tổng tiền trên hóa đơn")
    items: List[BillItem] = Field(default_factory=list, description="Danh sách hàng hóa")
    price_warnings: List[str] = Field(default_factory=list, description="Cảnh báo về đơn giá bất thường")
    serves_campaign_goal: bool = Field(default=True, description="Phục vụ mục tiêu chiến dịch")
    reasoning: str = Field(default="", description="Lý do đánh giá")
    trust_score: int = Field(default=0, ge=0, le=100, description="Điểm tin cậy 0-100")


class ImageRelevanceResult(BaseModel):
    """Result for a single image relevance check"""
    image_index: int
    image_url: str = ""
    similarity: float = Field(ge=0.0, le=1.0)
    is_relevant: bool
    reasoning: str


class DuplicateCheckResult(BaseModel):
    """Result for duplicate image check"""
    is_duplicate: bool
    matching_url: Optional[str] = None
    similarity: Optional[float] = None


class ClipAnalysisResult(BaseModel):
    """Result from CLIP local AI analysis"""
    scene_relevance_score: float = Field(
        default=0.0, 
        ge=0.0, 
        le=1.0,
        description="Average relevance score for scene images"
    )
    image_results: List[ImageRelevanceResult] = Field(
        default_factory=list,
        description="Individual image analysis results"
    )
    duplicate_detected: bool = Field(default=False, description="Có phát hiện ảnh trùng lặp")
    duplicate_details: List[DuplicateCheckResult] = Field(
        default_factory=list,
        description="Chi tiết về ảnh trùng lặp"
    )


class HybridReasoningResponse(BaseModel):
    """
    Response payload for hybrid reasoning
    
    Sent back to Core-service via HTTP callback after verification completes.
    """
    proof_id: str = Field(..., description="ID của proof")
    trust_score: int = Field(default=0, ge=0, le=100, description="Điểm tin cậy tổng hợp 0-100")
    is_valid: bool = Field(default=False, description="Minh chứng hợp lệ không")
    
    clip_analysis: ClipAnalysisResult = Field(
        default_factory=ClipAnalysisResult,
        description="Kết quả phân tích CLIP (Local AI)"
    )
    gemini_analysis: GeminiAnalysisResult = Field(
        default_factory=GeminiAnalysisResult,
        description="Kết quả phân tích Gemini (Remote AI)"
    )
    
    analysis_summary: str = Field(default="", description="Tóm tắt phân tích")
    trust_hash: str = Field(default="", description="SHA-256 hash của kết quả xác thực cho blockchain")
    timestamp: datetime = None
    
    class Config:
        populate_by_name = True
    
    def __init__(self, **data):
        if 'timestamp' not in data or data['timestamp'] is None:
            data['timestamp'] = datetime.now()
        super().__init__(**data)
        
        # Compute trust_hash if not provided
        if not self.trust_hash:
            self.trust_hash = self._compute_trust_hash()
    
    def _compute_trust_hash(self) -> str:
        """
        Compute SHA-256 hash of the verification result for blockchain integrity
        
        Hash includes: proof_id, trust_score, is_valid, timestamp (ISO format)
        """
        hash_input = {
            "proof_id": self.proof_id,
            "trust_score": self.trust_score,
            "is_valid": self.is_valid,
            "timestamp": self.timestamp.isoformat() if self.timestamp else "",
            "gemini_total": self.gemini_analysis.total_amount if self.gemini_analysis else 0,
            "clip_score": self.clip_analysis.scene_relevance_score if self.clip_analysis else 0
        }
        
        hash_string = json.dumps(hash_input, sort_keys=True, default=str)
        hash_result = hashlib.sha256(hash_string.encode()).hexdigest()
        
        return f"sha256:{hash_result}"


class CallbackPayload(BaseModel):
    """Payload for HTTP callback to Core-service"""
    proof_id: str
    trust_score: int
    is_valid: bool
    analysis_summary: str
    trust_hash: str
    gemini_total_amount: float = 0.0
    gemini_items_count: int = 0
    gemini_price_warnings: List[str] = []
    clip_scene_score: float = 0.0
    duplicate_detected: bool = False
    timestamp: datetime
    
    @classmethod
    def from_response(cls, response: HybridReasoningResponse) -> "CallbackPayload":
        """Create callback payload from full response"""
        return cls(
            proof_id=response.proof_id,
            trust_score=response.trust_score,
            is_valid=response.is_valid,
            analysis_summary=response.analysis_summary,
            trust_hash=response.trust_hash,
            gemini_total_amount=response.gemini_analysis.total_amount,
            gemini_items_count=len(response.gemini_analysis.items),
            gemini_price_warnings=response.gemini_analysis.price_warnings,
            clip_scene_score=response.clip_analysis.scene_relevance_score,
            duplicate_detected=response.clip_analysis.duplicate_detected,
            timestamp=response.timestamp
        )
