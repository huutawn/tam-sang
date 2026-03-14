"""
Pydantic models for Hybrid Reasoning events.

The Day 1 refactor keeps a single proof-AI flow and makes the request
schema tolerant to both legacy camelCase payloads and the new snake_case
canonical format.
"""

from datetime import datetime
import hashlib
import json
from typing import List, Optional

from pydantic import AliasChoices, BaseModel, Field


class HybridReasoningRequest(BaseModel):
    """Request payload for hybrid reasoning."""

    proof_id: str = Field(
        ...,
        validation_alias=AliasChoices("proof_id", "proofId"),
        description="ID cua proof can xac thuc",
    )
    campaign_id: str = Field(
        ...,
        validation_alias=AliasChoices("campaign_id", "campaignId"),
        description="ID cua chien dich",
    )
    list_bill_image_url: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("list_bill_image_url", "listBillImageUrl"),
        description="Danh sach URL anh hoa don",
    )
    list_image_url: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("list_image_url", "listImageUrl"),
        description="Danh sach URL anh hien truong",
    )
    withdrawal_reason: str = Field(
        ...,
        validation_alias=AliasChoices("withdrawal_reason", "withdrawalReason"),
        description="Ly do rut tien",
    )
    campaign_goal: str = Field(
        ...,
        validation_alias=AliasChoices("campaign_goal", "campaignGoal"),
        description="Muc tieu chien dich",
    )
    timestamp: datetime | None = None

    class Config:
        populate_by_name = True

    def __init__(self, **data):
        if "timestamp" not in data or data["timestamp"] is None:
            data["timestamp"] = datetime.now()
        super().__init__(**data)


class BillItem(BaseModel):
    """Single item extracted from a bill."""

    name: str = Field(..., description="Ten hang hoa")
    quantity: float = Field(default=1.0, description="So luong")
    unit_price: float = Field(default=0.0, description="Don gia")
    total_price: float = Field(default=0.0, description="Thanh tien")
    is_reasonable: bool = Field(default=True, description="Don gia hop ly hay khong")


class GeminiAnalysisResult(BaseModel):
    """Result from bill analysis."""

    total_amount: float = Field(default=0.0, description="Tong tien tren hoa don")
    items: List[BillItem] = Field(default_factory=list, description="Danh sach hang hoa")
    price_warnings: List[str] = Field(default_factory=list, description="Canh bao don gia bat thuong")
    validation_warnings: List[str] = Field(default_factory=list, description="Canh bao validator cuc bo")
    serves_campaign_goal: bool = Field(default=True, description="Phuc vu muc tieu chien dich")
    reasoning: str = Field(default="", description="Ly do danh gia")
    trust_score: int = Field(default=0, ge=0, le=100, description="Diem tin cay 0-100")


class ImageRelevanceResult(BaseModel):
    """Result for a single image relevance check."""

    image_index: int
    image_url: str = ""
    similarity: float = Field(ge=0.0, le=1.0)
    is_relevant: bool
    reasoning: str


class DuplicateCheckResult(BaseModel):
    """Result for duplicate image check."""

    is_duplicate: bool
    matching_url: Optional[str] = None
    similarity: Optional[float] = None


class ClipAnalysisResult(BaseModel):
    """Result from local scene-image analysis."""

    scene_relevance_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Average relevance score for scene images",
    )
    image_results: List[ImageRelevanceResult] = Field(
        default_factory=list,
        description="Individual image analysis results",
    )
    duplicate_detected: bool = Field(default=False, description="Co phat hien anh trung lap")
    duplicate_details: List[DuplicateCheckResult] = Field(
        default_factory=list,
        description="Chi tiet ve anh trung lap",
    )


class HybridReasoningResponse(BaseModel):
    """Response payload for hybrid reasoning."""

    proof_id: str = Field(..., description="ID cua proof")
    trust_score: int = Field(default=0, ge=0, le=100, description="Diem tin cay tong hop 0-100")
    is_valid: bool = Field(default=False, description="Minh chung hop le hay khong")
    decision: str = Field(default="SUSPICIOUS", description="Ket luan cua rubric Day 1")
    rubric_version: str = Field(default="day1-v1", description="Phien ban rubric cham diem")
    clip_analysis: ClipAnalysisResult = Field(
        default_factory=ClipAnalysisResult,
        description="Ket qua phan tich scene",
    )
    gemini_analysis: GeminiAnalysisResult = Field(
        default_factory=GeminiAnalysisResult,
        description="Ket qua phan tich hoa don",
    )
    analysis_summary: str = Field(default="", description="Tom tat phan tich")
    trust_hash: str = Field(default="", description="SHA-256 hash cua ket qua xac thuc")
    timestamp: datetime | None = None

    class Config:
        populate_by_name = True

    def __init__(self, **data):
        if "timestamp" not in data or data["timestamp"] is None:
            data["timestamp"] = datetime.now()
        super().__init__(**data)

        if not self.trust_hash:
            self.trust_hash = self._compute_trust_hash()

    def _compute_trust_hash(self) -> str:
        hash_input = {
            "proof_id": self.proof_id,
            "trust_score": self.trust_score,
            "is_valid": self.is_valid,
            "decision": self.decision,
            "rubric_version": self.rubric_version,
            "timestamp": self.timestamp.isoformat() if self.timestamp else "",
            "gemini_total": self.gemini_analysis.total_amount if self.gemini_analysis else 0,
            "clip_score": self.clip_analysis.scene_relevance_score if self.clip_analysis else 0,
        }

        hash_string = json.dumps(hash_input, sort_keys=True, default=str)
        hash_result = hashlib.sha256(hash_string.encode()).hexdigest()
        return f"sha256:{hash_result}"


class CallbackPayload(BaseModel):
    """Payload for HTTP callback to Core-service."""

    proof_id: str
    trust_score: int
    is_valid: bool
    analysis_summary: str
    decision: str = "SUSPICIOUS"
    rubric_version: str = "day1-v1"
    trust_hash: str
    gemini_total_amount: float = 0.0
    gemini_items_count: int = 0
    gemini_price_warnings: List[str] = []
    gemini_validation_warnings: List[str] = []
    clip_scene_score: float = 0.0
    duplicate_detected: bool = False
    timestamp: datetime

    @classmethod
    def from_response(cls, response: HybridReasoningResponse) -> "CallbackPayload":
        return cls(
            proof_id=response.proof_id,
            trust_score=response.trust_score,
            is_valid=response.is_valid,
            analysis_summary=response.analysis_summary,
            decision=response.decision,
            rubric_version=response.rubric_version,
            trust_hash=response.trust_hash,
            gemini_total_amount=response.gemini_analysis.total_amount,
            gemini_items_count=len(response.gemini_analysis.items),
            gemini_price_warnings=response.gemini_analysis.price_warnings,
            gemini_validation_warnings=response.gemini_analysis.validation_warnings,
            clip_scene_score=response.clip_analysis.scene_relevance_score,
            duplicate_detected=response.clip_analysis.duplicate_detected,
            timestamp=response.timestamp,
        )
