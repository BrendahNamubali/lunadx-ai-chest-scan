from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db, Scan, Patient, User, AuditLog
from schemas import ScanCreate, ScanResponse, ScanUpdate, BaseResponse
from auth import get_current_user, require_role

scans_router = APIRouter(prefix="/scans", tags=["scans"])

@scans_router.post("/", response_model=ScanResponse)
async def create_scan(
    scan: ScanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Radiologist", "Clinician"]))
):
    """Create a new scan record (before AI analysis)"""
    
    # Verify patient exists and belongs to user's organization
    patient = db.query(Patient).filter(
        Patient.id == scan.patient_id,
        Patient.org_id == current_user.org_id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Create scan with initial data
    db_scan = Scan(
        patient_id=scan.patient_id,
        doctor_id=scan.doctor_id,
        org_id=current_user.org_id,
        image_url=scan.image_url,
        view_position=scan.view_position,
        clinical_notes=scan.clinical_notes
    )
    
    db.add(db_scan)
    
    # Create audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="scan_created",
        details=f"Created scan for patient: {patient.name}"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(db_scan)
    
    return ScanResponse(
        id=db_scan.id,
        patient_id=db_scan.patient_id,
        patient_name=patient.name,
        doctor_id=db_scan.doctor_id,
        doctor_name=current_user.name,
        org_id=db_scan.org_id,
        tb_risk=db_scan.tb_risk,
        pneumonia_risk=db_scan.pneumonia_risk,
        lung_opacity_risk=db_scan.lung_opacity_risk,
        pleural_effusion_risk=db_scan.pleural_effusion_risk,
        lung_nodules_risk=db_scan.lung_nodules_risk,
        abnormality_score=db_scan.abnormality_score,
        risk_level=db_scan.risk_level,
        findings=[],
        suggestions=[],
        ai_summary="",
        heatmap_overlay_url=db_scan.heatmap_overlay_url,
        image_url=db_scan.image_url,
        scan_date=db_scan.scan_date,
        doctor_notes=db_scan.doctor_notes,
        view_position=db_scan.view_position,
        clinical_notes=db_scan.clinical_notes,
        processing_time_ms=db_scan.processing_time_ms,
        model_version=db_scan.model_version,
        used_simulation=db_scan.used_simulation
    )

@scans_router.get("/", response_model=List[dict])
async def get_scans(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    patient_id: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all scans for the current user's organization"""
    
    query = db.query(Scan).filter(Scan.org_id == current_user.org_id)
    
    if patient_id:
        query = query.filter(Scan.patient_id == patient_id)
    
    if risk_level:
        query = query.filter(Scan.risk_level == risk_level)
    
    scans = query.order_by(Scan.scan_date.desc()).offset(skip).limit(limit).all()
    
    # Convert to response format with patient and doctor names
    scan_responses = []
    for scan in scans:
        patient = db.query(Patient).filter(Patient.id == scan.patient_id).first()
        doctor = db.query(User).filter(User.id == scan.doctor_id).first()
        
        scan_responses.append({
            "id": scan.id,
            "patient_id": scan.patient_id,
            "patient_name": patient.name if patient else "Unknown",
            "doctor_id": scan.doctor_id,
            "doctor_name": doctor.name if doctor else "Unknown",
            "scan_date": scan.scan_date,
            "risk_level": scan.risk_level,
            "abnormality_score": scan.abnormality_score,
            "tb_risk": scan.tb_risk,
            "pneumonia_risk": scan.pneumonia_risk,
            "lung_opacity_risk": scan.lung_opacity_risk,
            "pleural_effusion_risk": scan.pleural_effusion_risk,
            "lung_nodules_risk": scan.lung_nodules_risk,
            "image_url": scan.image_url,
            "heatmap_overlay_url": scan.heatmap_overlay_url,
            "ai_summary": scan.ai_summary,
            "findings": scan.findings.split(",") if scan.findings else [],
            "suggestions": scan.suggestions.split(",") if scan.suggestions else [],
            "view_position": scan.view_position,
            "processing_time_ms": scan.processing_time_ms,
            "model_version": scan.model_version,
            "used_simulation": scan.used_simulation
        })
    
    return scan_responses

@scans_router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific scan"""
    
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.org_id == current_user.org_id
    ).first()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    patient = db.query(Patient).filter(Patient.id == scan.patient_id).first()
    doctor = db.query(User).filter(User.id == scan.doctor_id).first()
    
    return ScanResponse(
        id=scan.id,
        patient_id=scan.patient_id,
        patient_name=patient.name if patient else "Unknown",
        doctor_id=scan.doctor_id,
        doctor_name=doctor.name if doctor else "Unknown",
        org_id=scan.org_id,
        tb_risk=scan.tb_risk,
        pneumonia_risk=scan.pneumonia_risk,
        lung_opacity_risk=scan.lung_opacity_risk,
        pleural_effusion_risk=scan.pleural_effusion_risk,
        lung_nodules_risk=scan.lung_nodules_risk,
        abnormality_score=scan.abnormality_score,
        risk_level=scan.risk_level,
        findings=scan.findings.split(",") if scan.findings else [],
        suggestions=scan.suggestions.split(",") if scan.suggestions else [],
        ai_summary=scan.ai_summary,
        heatmap_overlay_url=scan.heatmap_overlay_url,
        image_url=scan.image_url,
        scan_date=scan.scan_date,
        doctor_notes=scan.doctor_notes,
        view_position=scan.view_position,
        clinical_notes=scan.clinical_notes,
        processing_time_ms=scan.processing_time_ms,
        model_version=scan.model_version,
        used_simulation=scan.used_simulation
    )

@scans_router.put("/{scan_id}", response_model=ScanResponse)
async def update_scan(
    scan_id: str,
    scan_update: ScanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Radiologist"]))
):
    """Update scan notes (Admin and Radiologist only)"""
    
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.org_id == current_user.org_id
    ).first()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    # Update only provided fields
    if scan_update.doctor_notes is not None:
        scan.doctor_notes = scan_update.doctor_notes
    
    # Create audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="scan_updated",
        details=f"Updated scan notes for scan: {scan_id}"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(scan)
    
    patient = db.query(Patient).filter(Patient.id == scan.patient_id).first()
    doctor = db.query(User).filter(User.id == scan.doctor_id).first()
    
    return ScanResponse(
        id=scan.id,
        patient_id=scan.patient_id,
        patient_name=patient.name if patient else "Unknown",
        doctor_id=scan.doctor_id,
        doctor_name=doctor.name if doctor else "Unknown",
        org_id=scan.org_id,
        tb_risk=scan.tb_risk,
        pneumonia_risk=scan.pneumonia_risk,
        lung_opacity_risk=scan.lung_opacity_risk,
        pleural_effusion_risk=scan.pleural_effusion_risk,
        lung_nodules_risk=scan.lung_nodules_risk,
        abnormality_score=scan.abnormality_score,
        risk_level=scan.risk_level,
        findings=scan.findings.split(",") if scan.findings else [],
        suggestions=scan.suggestions.split(",") if scan.suggestions else [],
        ai_summary=scan.ai_summary,
        heatmap_overlay_url=scan.heatmap_overlay_url,
        image_url=scan.image_url,
        scan_date=scan.scan_date,
        doctor_notes=scan.doctor_notes,
        view_position=scan.view_position,
        clinical_notes=scan.clinical_notes,
        processing_time_ms=scan.processing_time_ms,
        model_version=scan.model_version,
        used_simulation=scan.used_simulation
    )

@scans_router.delete("/{scan_id}", response_model=BaseResponse)
async def delete_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    """Delete a scan (Admin only)"""
    
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.org_id == current_user.org_id
    ).first()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    patient = db.query(Patient).filter(Patient.id == scan.patient_id).first()
    
    db.delete(scan)
    
    # Create audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="scan_deleted",
        details=f"Deleted scan for patient: {patient.name if patient else 'Unknown'}"
    )
    db.add(audit)
    
    db.commit()
    
    return BaseResponse(
        success=True,
        message="Scan deleted successfully"
    )

@scans_router.get("/stats/overview")
async def get_scan_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get scan statistics for the organization"""
    
    total_scans = db.query(Scan).filter(Scan.org_id == current_user.org_id).count()
    
    # Risk level distribution
    high_risk = db.query(Scan).filter(
        Scan.org_id == current_user.org_id,
        Scan.risk_level == "High"
    ).count()
    
    medium_risk = db.query(Scan).filter(
        Scan.org_id == current_user.org_id,
        Scan.risk_level == "Medium"
    ).count()
    
    low_risk = db.query(Scan).filter(
        Scan.org_id == current_user.org_id,
        Scan.risk_level == "Low"
    ).count()
    
    # Recent scans (last 30 days)
    from datetime import timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_scans = db.query(Scan).filter(
        Scan.org_id == current_user.org_id,
        Scan.scan_date >= thirty_days_ago
    ).count()
    
    return {
        "total_scans": total_scans,
        "risk_distribution": {
            "high": high_risk,
            "medium": medium_risk,
            "low": low_risk
        },
        "recent_scans": recent_scans
    }
