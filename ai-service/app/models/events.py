from pydantic import BaseModel
from datetime import datetime


class KycInitiatedEvent(BaseModel):
    kycId: str
    userId: str
    frontImageUrl: str
    backImageUrl: str
    timestamp: datetime


class ExtractedKycData(BaseModel):
    fullName: str
    dob: str
    idNumber: str
    idType: str  # CITIZEN_ID, OLD_ID_CARD
    address: str
    gender: str = ""           # Nam/Nữ
    nationality: str = ""      # Quốc tịch
    placeOfOrigin: str = ""    # Quê quán
    issueDate: str = ""        # Ngày cấp
    expiryDate: str = ""       # Ngày hết hạn


class KycAnalyzedEvent(BaseModel):
    kycId: str
    userId: str
    extractedData: ExtractedKycData
    confidence: float
    timestamp: datetime
