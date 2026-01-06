from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class ProofVerificationRequest(BaseModel):
    """
    Event để request verification cho proof (hóa đơn hoặc selfie)
    
    Attributes:
        proofId: ID của proof cần verify
        imageUrl: URL của ảnh proof
        type: Loại proof - INVOICE (hóa đơn) hoặc SELFIE (ảnh tự chụp)
        context: Context data tùy theo type:
            - INVOICE: {"campaignContext": "...", "withdrawalReason": "..."}
            - SELFIE: {"kycImageUrl": "..."} (URL ảnh CMND/CCCD để so sánh)
    """
    proofId: str
    imageUrl: str
    type: Literal["INVOICE", "SELFIE"]
    context: dict
    timestamp: datetime = None
    
    def __init__(self, **data):
        if 'timestamp' not in data or data['timestamp'] is None:
            data['timestamp'] = datetime.now()
        super().__init__(**data)


class ForensicsMetadata(BaseModel):
    """
    Metadata từ image forensics analysis
    
    Attributes:
        has_exif_warning: Có cảnh báo về EXIF không (edited, missing metadata)
        software_detected: Phần mềm chỉnh sửa phát hiện được (nếu có)
        perceptual_hash: Hash của ảnh để detect duplicate
        is_duplicate: Có phải ảnh trùng lặp không
    """
    has_exif_warning: bool
    software_detected: str = ""
    perceptual_hash: str = ""
    is_duplicate: bool = False
    details: str = ""


class ProofVerificationResult(BaseModel):
    """
    Kết quả verification của proof
    
    Attributes:
        proofId: ID của proof
        score: Điểm tin cậy 0-100
        isValid: Proof có hợp lệ không
        analysisDetails: Chi tiết phân tích (từ LLM hoặc face verification)
        metadata: Thông tin forensics (EXIF, hash, etc.)
        verifiedAt: Thời điểm verify
    """
    proofId: str
    score: int  # 0-100
    isValid: bool
    analysisDetails: str
    metadata: ForensicsMetadata
    verifiedAt: datetime = None
    
    def __init__(self, **data):
        if 'verifiedAt' not in data or data['verifiedAt'] is None:
            data['verifiedAt'] = datetime.now()
        super().__init__(**data)
