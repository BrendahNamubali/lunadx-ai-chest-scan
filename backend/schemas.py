from pydantic import BaseModel, model_validator
from typing import List, Optional, Any

class Finding(BaseModel):
    label: str
    confidence: float
    bbox: Optional[List[float]] = None
    pathology: Optional[str] = None
    probability: Optional[float] = None
    severity: Optional[str] = None
    icd10_code: Optional[str] = None

    @model_validator(mode='after')
    def fill_extended_fields(self):
        if self.pathology is None:
            self.pathology = self.label
        if self.probability is None:
            self.probability = self.confidence
        if self.severity is None:
            self.severity = "flagged" if self.confidence > 0.5 else "normal"
        if self.icd10_code is None:
            self.icd10_code = "J98.9"
        return self

# Auth schemas
class UserLogin(BaseModel):
    email: str
    password: str

class UserAuth(BaseModel):
    email: str
    password: str
    role: Optional[str] = "doctor"

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    name: Optional[str] = None

# Base response
class BaseResponse(BaseModel):
    success: bool
    message: str

# Patient schemas
class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    notes: Optional[str] = None

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    notes: Optional[str] = None

class PatientResponse(BaseModel):
    id: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    notes: Optional[str] = None

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int

# Scan schemas
class ScanCreate(BaseModel):
    patient_id: str
    notes: Optional[str] = None

class ScanUpdate(BaseModel):
    notes: Optional[str] = None

class ScanResponse(BaseModel):
    id: str
    patient_id: str
    notes: Optional[str] = None
    status: Optional[str] = None

# Analysis schemas
class AnalysisRequest(BaseModel):
    patient_id: Optional[str] = None
    notes: Optional[str] = None

class BackendResponse(BaseModel):
    success: bool
    message: str
    findings: Optional[List[Finding]] = None
    confidence: Optional[float] = None
    raw_output: Optional[dict] = None