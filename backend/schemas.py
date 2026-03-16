from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Base schemas
class BaseResponse(BaseModel):
    success: bool
    message: str

# Organization schemas
class OrganizationCreate(BaseModel):
    name: str
    location: str
    admin_email: EmailStr
    admin_name: str
    password: str

class OrganizationResponse(BaseModel):
    id: str
    name: str
    location: str
    admin_email: str
    created_at: datetime
    scan_limit: int
    plan: str
    
    class Config:
        from_attributes = True

# User schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: str
    password: str
    org_id: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    org_id: str
    org_name: Optional[str] = None
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class UserAuth(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

# Patient schemas
class PatientCreate(BaseModel):
    name: str
    age: int
    sex: str
    hospital_id: str
    symptoms: Optional[str] = ""
    visit_date: str
    org_id: str

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    symptoms: Optional[str] = None
    visit_date: Optional[str] = None

class PatientResponse(BaseModel):
    id: str
    name: str
    age: int
    sex: str
    hospital_id: str
    symptoms: str
    visit_date: str
    created_at: datetime
    org_id: str
    
    class Config:
        from_attributes = True

# Scan schemas
class ScanCreate(BaseModel):
    patient_id: str
    doctor_id: str
    org_id: str
    image_url: str
    view_position: Optional[str] = "PA"
    clinical_notes: Optional[str] = ""

class ScanUpdate(BaseModel):
    doctor_notes: Optional[str] = None

class ScanResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    doctor_id: str
    doctor_name: Optional[str] = None
    org_id: str
    
    # AI Results
    tb_risk: float
    pneumonia_risk: float
    lung_opacity_risk: float
    pleural_effusion_risk: float
    lung_nodules_risk: float
    abnormality_score: float
    risk_level: str
    
    # Findings
    findings: Optional[List[str]] = []
    suggestions: Optional[List[str]] = []
    ai_summary: Optional[str] = ""
    heatmap_overlay_url: Optional[str] = ""
    image_url: str
    
    # Metadata
    scan_date: datetime
    doctor_notes: Optional[str] = ""
    view_position: str
    clinical_notes: Optional[str] = ""
    processing_time_ms: Optional[int] = None
    model_version: Optional[str] = None
    used_simulation: bool = False
    
    class Config:
        from_attributes = True

# Analysis request/response
class AnalysisRequest(BaseModel):
    patient_id: str
    clinical_notes: Optional[str] = ""
    view_position: str = "PA"

class BackendResponse(BaseModel):
    study_id: str
    findings: List[dict]
    heatmap_b64: str
    draft_report: dict
    processing_time_ms: int
    model_version: str
    used_simulation: bool

# API Response wrappers
class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    per_page: int
    total_pages: int
