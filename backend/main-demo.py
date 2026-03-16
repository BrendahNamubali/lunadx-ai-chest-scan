from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any

# Simple FastAPI app without database dependencies for now
app = FastAPI(
    title="LunaDX AI Chest Scan API",
    description="Medical AI platform for chest X-ray analysis",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory storage for demo
USERS = {
    "admin@lunadx.com": {
        "id": "1",
        "email": "admin@lunadx.com",
        "name": "James Wilson",
        "role": "Admin",
        "password": "admin123",
        "orgId": "org-metro",
        "orgName": "Metro Health Clinic"
    },
    "doctor@lunadx.com": {
        "id": "2", 
        "email": "doctor@lunadx.com",
        "name": "Dr. Sarah Chen",
        "role": "Radiologist",
        "password": "doctor123",
        "orgId": "org-metro",
        "orgName": "Metro Health Clinic"
    },
    "clinician@lunadx.com": {
        "id": "3",
        "email": "clinician@lunadx.com", 
        "name": "Dr. Amara Osei",
        "role": "Clinician",
        "password": "clinician123",
        "orgId": "org-metro",
        "orgName": "Metro Health Clinic"
    }
}

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    orgId: str
    orgName: str

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "database": "in-memory-demo",
        "model": {"model_loaded": False, "cuda_available": False}
    }

# Authentication endpoints
@app.post("/auth/login", response_model=AuthResponse)
async def login(credentials: LoginRequest):
    user_data = USERS.get(credentials.email)
    if user_data and user_data["password"] == credentials.password:
        return AuthResponse(
            user=UserResponse(**user_data),
            access_token="demo-token-" + user_data["id"],
            token_type="bearer"
        )
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/auth/me")
async def get_current_user():
    return {"message": "Demo endpoint - would return current user"}

# Patients endpoints (demo)
@app.get("/patients")
async def get_patients():
    return [
        {
            "id": "patient-1",
            "name": "Kwame Asante",
            "age": 45,
            "sex": "Male",
            "hospitalId": "PT-1042",
            "symptoms": "Cough, fever",
            "visitDate": "2026-03-15",
            "createdAt": datetime.utcnow().isoformat(),
            "orgId": "org-metro"
        }
    ]

@app.post("/patients")
async def create_patient(patient_data: dict):
    return {"message": "Patient created", "patient": patient_data}

# Scans endpoints (demo)
@app.get("/scans")
async def get_scans():
    return [
        {
            "id": "scan-1",
            "patientId": "patient-1",
            "patientName": "Kwame Asante",
            "doctorId": "2",
            "doctorName": "Dr. Sarah Chen",
            "tbRisk": 0.15,
            "pneumoniaRisk": 0.25,
            "riskLevel": "Low",
            "scanDate": datetime.utcnow().isoformat()
        }
    ]

# Analysis endpoint (demo)
@app.post("/analyze")
async def analyze_xray():
    return {
        "success": True,
        "study_id": f"study-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "findings": [
            {
                "pathology": "Pneumonia",
                "probability": 0.15,
                "severity": "normal",
                "icd10_code": "J18.9"
            },
            {
                "pathology": "Tuberculosis", 
                "probability": 0.08,
                "severity": "normal",
                "icd10_code": "A15.0"
            }
        ],
        "heatmap_b64": "",
        "draft_report": {
            "indication": "Chest X-ray for screening",
            "technique": "PA view, adequate inspiration",
            "findings_text": "Clear lung fields, no acute infiltrates",
            "impression": "Normal chest X-ray",
            "recommendation": "No acute findings"
        },
        "processing_time_ms": 1500,
        "model_version": "Demo Mode",
        "used_simulation": True
    }

@app.get("/")
async def root():
    return {
        "message": "LunaDX AI Chest Scan API - Demo Mode",
        "version": "1.0.0",
        "status": "running",
        "database": "in-memory (demo)",
        "endpoints": {
            "health": "/health",
            "auth": "/auth",
            "patients": "/patients", 
            "scans": "/scans",
            "analyze": "/analyze",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    print("🚀 Starting LunaDX Demo Server...")
    print("📋 Default Users:")
    print("   Admin: admin@lunadx.com / admin123")
    print("   Doctor: doctor@lunadx.com / doctor123")
    print("   Clinician: clinician@lunadx.com / clinician123")
    print("🌐 Server: http://127.0.0.1:8000")
    print("📚 API Docs: http://127.0.0.1:8000/docs")
    
    uvicorn.run(app, host="127.0.0.1", port=8000)
