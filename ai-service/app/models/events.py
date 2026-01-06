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
    idType: str
    address: str


class KycAnalyzedEvent(BaseModel):
    kycId: str
    userId: str
    extractedData: ExtractedKycData
    confidence: float
    timestamp: datetime
