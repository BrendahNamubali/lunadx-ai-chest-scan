from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import time
import base64
import io
from PIL import Image
import numpy as np
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

# Import existing modules
from dicom_parser import DICOMParser
from report_drafter import ReportDrafter
from schemas import Finding

# Import new database modules
from database import get_db, create_tables, init_db, Scan, Patient, User, Organization, AuditLog
from schemas import BackendResponse, AnalysisRequest
from auth import get_current_user, require_role
from auth import auth_router
from patients import patients_router
from scans import scans_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
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

# Include routers
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(scans_router)

# Global components
dicom_parser = None
report_drafter = None

@app.on_event("startup")
async def startup_event():
    global dicom_parser, report_drafter
    create_tables()
    init_db()
    logger.info("✅ Database initialized")
    try:
        dicom_parser = DICOMParser()
        report_drafter = ReportDrafter()
        logger.info("✅ All AI components initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize AI components: {e}")
        raise

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "model": {"model": "local-huggingface", "status": "active"},
        "database": "connected"
    }

class AnalyzeResponse(BaseModel):
    success: bool
    study_id: str
    findings: List[dict]
    heatmap_b64: str
    draft_report: dict
    processing_time_ms: int
    model_version: str
    ai_summary: Optional[str] = None
    tb_probability: float
    pneumonia_probability: float

@app.post("/chexpert")
async def chexpert_endpoint(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    clinical_notes: Optional[str] = Form(None),
    view_position: str = Form("PA"),
    db: Session = Depends(get_db),
):
    return await analyze_xray(file, patient_id, clinical_notes, view_position, db)

@app.post("/analyze")
async def analyze_xray(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    clinical_notes: Optional[str] = Form(None),
    view_position: str = Form("PA"),
    db: Session = Depends(get_db),
):
    start_time = time.time()
    study_id = f"study-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')

        # X-ray validation
        img_array = np.array(image)
        r, g, b = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2]
        color_variance = float(np.mean(np.abs(r.astype(int) - g.astype(int))) +
                               np.mean(np.abs(g.astype(int) - b.astype(int))))
        if color_variance > 10:
            raise HTTPException(
                status_code=400,
                detail="Image does not appear to be a chest X-ray. Please upload a grayscale X-ray image."
            )

        try:
            predictions = call_huggingface_model(image)
            model_version = "PneumoniaViT-v1.0"
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            raise HTTPException(status_code=503, detail="AI model unavailable")

        heatmap_b64 = ""

        findings_list = []
        for pathology, probability in predictions.items():
            if probability > 0.1:
                severity = "High" if probability > 0.7 else "Medium" if probability > 0.4 else "Low"
                icd10_code = get_icd10_code(pathology)
                findings_list.append({
                    "label": pathology,
                    "confidence": probability,
                    "pathology": pathology,
                    "probability": probability,
                    "severity": severity,
                    "icd10_code": icd10_code
                })

        findings_list.sort(key=lambda x: x["probability"], reverse=True)

        finding_objects = [Finding(**f) for f in findings_list[:5]]

        draft_report = {
            "indication": f"Chest X-ray screening - {view_position} view",
            "technique": f"{view_position} chest radiograph",
            "findings_text": "",
            "impression": "",
            "recommendation": ""
        }

        if report_drafter:
            try:
                draft_report = report_drafter.generate_report(
                    findings=finding_objects,
                    patient_id=patient_id,
                    view_position=view_position,
                    clinical_notes=clinical_notes
                )
            except Exception as e:
                logger.warning(f"Report generation failed: {e}")

        tb_probability = predictions.get('Tuberculosis', 0.0) * 100
        pneumonia_probability = predictions.get('Pneumonia', 0.0) * 100

        ai_summary = draft_report.get("impression", "AI analysis completed successfully.")
        processing_time_ms = int((time.time() - start_time) * 1000)
        logger.info(f"✅ Analysis completed in {processing_time_ms}ms — {predictions}")

        return {
            "success": True,
            "study_id": study_id,
            "findings": findings_list[:5],
            "heatmap_b64": heatmap_b64,
            "draft_report": draft_report,
            "processing_time_ms": processing_time_ms,
            "model_version": model_version,
            "ai_summary": ai_summary,
            "tb_probability": round(tb_probability, 1),
            "pneumonia_probability": round(pneumonia_probability, 1)
        }

    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def get_icd10_code(pathology: str) -> str:
    codes = {
        'Normal': 'Z00.00',
        'Atelectasis': 'J98.11',
        'Consolidation': 'J18.1',
        'Infiltration': 'J18.9',
        'Pneumothorax': 'J93.9',
        'Edema': 'J81',
        'Emphysema': 'J43.9',
        'Fibrosis': 'J84.10',
        'Effusion': 'J90',
        'Pneumonia': 'J18.9',
        'Pleural_Thickening': 'J94.8',
        'Cardiomegaly': 'I51.7',
        'Nodule': 'R91.1',
        'Mass': 'R91.1',
        'Hernia': 'K46.9',
        'Lung Lesion': 'R91.8',
        'Fracture': 'S22.9',
        'Lung Opacity': 'R91.8',
        'Enlarged Cardiomediastinum': 'R93.1',
    }
    return codes.get(pathology, 'R91.8')

_model = None
_processor = None

def get_local_model():
    global _model, _processor
    if _model is None:
        from transformers import AutoImageProcessor, AutoModelForImageClassification
        _processor = AutoImageProcessor.from_pretrained("lxyuan/vit-xray-pneumonia-classification")
        _model = AutoModelForImageClassification.from_pretrained("lxyuan/vit-xray-pneumonia-classification")
        _model.eval()
    return _model, _processor

def call_huggingface_model(image: Image.Image):
    import torch
    import torch.nn.functional as F

    model, processor = get_local_model()
    inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        logits = model(**inputs).logits

    probs = F.softmax(logits, dim=-1)[0]

    predictions = {
        "Normal": round(probs[0].item(), 4),
        "Pneumonia": round(probs[1].item(), 4),
    }

    return predictions

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port)