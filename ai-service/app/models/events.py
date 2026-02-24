from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Any


def parse_java_localdatetime(v: Any) -> datetime:
    if isinstance(v, (list, tuple)):
        # Java LocalDateTime format: [year, month, day, hour, minute, second, nanosecond]
        # Pydantic/Python expects: year, month, day, hour, minute, second, microsecond
        args = list(v)
        if len(args) >= 7:
            # Convert nanoseconds to microseconds
            args[6] = args[6] // 1000
        # If it has >7 elements, slice to 7. If <6, pad with 0
        while len(args) < 6:
            args.append(0)
        args = args[:7]
        return datetime(*args)
    return v

class KycInitiatedEvent(BaseModel):
    kycId: str
    userId: str
    frontImageUrl: str
    backImageUrl: str
    timestamp: datetime

    @field_validator("timestamp", mode="before")
    @classmethod
    def parse_timestamp(cls, v: Any) -> Any:
        return parse_java_localdatetime(v)


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
