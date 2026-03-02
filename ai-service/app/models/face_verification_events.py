from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class FaceVerificationRequest(BaseModel):
    """
    Event from Core Service requesting face verification for a withdrawal.
    
    Attributes:
        withdrawalId: ID of the withdrawal request
        userId: ID of the user (campaign owner)
        selfieImageUrl: URL of the selfie uploaded during withdrawal creation
        kycImageUrl: URL of the KYC front image (CCCD) — may be None, resolved via API
    """
    withdrawalId: str
    userId: str
    selfieImageUrl: str
    kycImageUrl: Optional[str] = None
    timestamp: datetime = None
    
    def __init__(self, **data):
        if 'timestamp' not in data or data['timestamp'] is None:
            data['timestamp'] = datetime.now()
        super().__init__(**data)


class FaceVerificationResult(BaseModel):
    """
    Result sent back to Core Service via HTTP callback.
    
    Attributes:
        withdrawal_id: ID of the withdrawal request
        verified: Whether face verification passed
        score: Confidence score (0-100)
        status: VERIFIED, WARNING, or FAILED
        analysis_log: Detailed log of the verification process
    """
    withdrawal_id: str
    verified: bool
    score: int  # 0-100
    status: str  # VERIFIED, WARNING, FAILED
    analysis_log: str
    timestamp: datetime = None
    
    def __init__(self, **data):
        if 'timestamp' not in data or data['timestamp'] is None:
            data['timestamp'] = datetime.now()
        super().__init__(**data)
