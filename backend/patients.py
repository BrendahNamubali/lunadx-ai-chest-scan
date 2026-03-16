from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db, Patient, User, Organization, Scan, AuditLog
from schemas import PatientCreate, PatientResponse, PatientUpdate, PaginatedResponse, BaseResponse
from auth import get_current_user, require_role

patients_router = APIRouter(prefix="/patients", tags=["patients"])

@patients_router.post("/", response_model=PatientResponse)
async def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Radiologist", "Clinician"]))
):
    """Create a new patient"""
    
    # Check if hospital ID already exists
    existing_patient = db.query(Patient).filter(Patient.hospital_id == patient.hospital_id).first()
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital ID already exists"
        )
    
    # Verify organization access
    if current_user.org_id != patient.org_id and current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create patients for other organizations"
        )
    
    db_patient = Patient(**patient.dict())
    db.add(db_patient)
    
    # Create audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="patient_created",
        details=f"Created patient: {patient.name} ({patient.hospital_id})"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(db_patient)
    
    return db_patient

@patients_router.get("/", response_model=List[PatientResponse])
async def get_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all patients for the current user's organization"""
    
    query = db.query(Patient).filter(Patient.org_id == current_user.org_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Patient.name.ilike(search_term) |
            Patient.hospital_id.ilike(search_term)
        )
    
    patients = query.offset(skip).limit(limit).all()
    return patients

@patients_router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific patient"""
    
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.org_id == current_user.org_id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    return patient

@patients_router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    patient_update: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Radiologist", "Clinician"]))
):
    """Update patient information"""
    
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.org_id == current_user.org_id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Update only provided fields
    update_data = patient_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
    
    # Create audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="patient_updated",
        details=f"Updated patient: {patient.name} ({patient.hospital_id})"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(patient)
    
    return patient

@patients_router.delete("/{patient_id}", response_model=BaseResponse)
async def delete_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    """Delete a patient (Admin only)"""
    
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.org_id == current_user.org_id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Check if patient has scans
    scans = db.query(Scan).filter(Scan.patient_id == patient_id).first()
    if scans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete patient with existing scans"
        )
    
    patient_name = patient.name
    
    db.delete(patient)
    
    # Create audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="patient_deleted",
        details=f"Deleted patient: {patient_name} ({patient.hospital_id})"
    )
    db.add(audit)
    
    db.commit()
    
    return BaseResponse(
        success=True,
        message=f"Patient {patient_name} deleted successfully"
    )

@patients_router.get("/{patient_id}/scans", response_model=List[dict])
async def get_patient_scans(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all scans for a specific patient"""
    
    # Verify patient belongs to user's organization
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.org_id == current_user.org_id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    scans = db.query(Scan).filter(Scan.patient_id == patient_id).order_by(Scan.scan_date.desc()).all()
    
    # Convert to response format
    scan_responses = []
    for scan in scans:
        scan_responses.append({
            "id": scan.id,
            "patient_id": scan.patient_id,
            "patient_name": patient.name,
            "doctor_id": scan.doctor_id,
            "doctor_name": scan.doctor.name if scan.doctor else None,
            "scan_date": scan.scan_date,
            "risk_level": scan.risk_level,
            "abnormality_score": scan.abnormality_score,
            "tb_risk": scan.tb_risk,
            "pneumonia_risk": scan.pneumonia_risk,
            "image_url": scan.image_url,
            "heatmap_overlay_url": scan.heatmap_overlay_url,
            "ai_summary": scan.ai_summary
        })
    
    return scan_responses
