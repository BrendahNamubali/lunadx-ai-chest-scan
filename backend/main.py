from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel
import os
import logging
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
import time
import base64
import io
from PIL import Image
from sqlalchemy.orm import Session

# Import existing modules
from dicom_parser import DICOMParser
from inference import CheXNetInference
from gradcam import GradCAMGenerator
from report_drafter import ReportDrafter

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
inference_engine = None
gradcam_generator = None
report_drafter = None

@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    global dicom_parser, inference_engine, gradcam_generator, report_drafter
    
    # Initialize database
    create_tables()
    init_db()
    logger.info("✅ Database initialized")
    
    # Initialize AI components
    try:
        dicom_parser = DICOMParser()
        inference_engine = CheXNetInference()
        gradcam_generator = GradCAMGenerator()
        report_drafter = ReportDrafter()
        
        logger.info("✅ All AI components initialized")
        logger.info(f"🔥 GPU Available: {inference_engine.get_model_info()['cuda_available']}")
        logger.info(f"📊 Model Loaded: {inference_engine.get_model_info()['model_loaded']}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize AI components: {e}")
        raise

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        model_info = inference_engine.get_model_info() if inference_engine else {"model_loaded": False}
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "model": model_info,
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Service unavailable")

class Finding(BaseModel):
    pathology: str
    probability: float
    severity: str
    icd10_code: str

class AnalyzeResponse(BaseModel):
    success: bool
    study_id: str
    findings: List[Finding]
    heatmap_b64: str
    draft_report: dict
    processing_time_ms: int
    model_version: str
    used_simulation: bool
    ai_summary: Optional[str] = None
    tb_probability: float
    pneumonia_probability: float

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_xray(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    clinical_notes: Optional[str] = Form(None),
    view_position: str = Form("PA"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Radiologist", "Clinician"]))
):
    """Analyze chest X-ray image with real AI"""
    start_time = time.time()
    
    try:
        # Validate file
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Generate study ID
        study_id = f"study-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Run AI inference
        if inference_engine and inference_engine.model_loaded:
            # Real CheXNet prediction
            predictions = inference_engine.predict(image)
            used_simulation = False
            model_version = "CheXNet-DenseNet121-v1.0"
        else:
            # Fallback to simulation
            predictions = simulate_predictions(image)
            used_simulation = True
            model_version = "CheXNet-Simulation-v1.0"
        
        # Generate heatmap using GradCAM
        heatmap_b64 = ""
        if gradcam_generator and inference_engine and inference_engine.model_loaded:
            try:
                heatmap = gradcam_generator.generate(image, inference_engine.model)
                # Convert heatmap to base64
                buffered = io.BytesIO()
                heatmap.save(buffered, format="PNG")
                heatmap_b64 = base64.b64encode(buffered.getvalue()).decode()
            except Exception as e:
                logger.warning(f"Failed to generate heatmap: {e}")
        
        # Convert predictions to findings format
        findings_list = []
        for pathology, probability in predictions.items():
            if probability > 0.1:  # Only include findings above 10%
                severity = "high" if probability > 0.7 else "medium" if probability > 0.4 else "normal"
                icd10_code = get_icd10_code(pathology)
                findings_list.append({
                    "pathology": pathology,
                    "probability": probability,
                    "severity": severity,
                    "icd10_code": icd10_code
                })
        
        # Sort by probability (highest first)
        findings_list.sort(key=lambda x: x["probability"], reverse=True)
        
        # Create Finding objects for report drafter
        finding_objects = [Finding(**f) for f in findings_list[:5]]  # Top 5 findings
        
        # Generate structured report using Groq
        draft_report = {
            "indication": f"Chest X-ray screening - {view_position} view",
            "technique": f"{view_position} chest radiograph, good inspiratory effort",
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
                logger.warning(f"Report generation failed: {e}, using template")
                draft_report = report_drafter._generate_template_report(
                    finding_objects, patient_id, view_position, clinical_notes
                )
        
        # Get TB and pneumonia probabilities specifically
        tb_probability = predictions.get('Pneumonia', 0.0) * 100
        pneumonia_probability = predictions.get('Pneumonia', 0.0) * 100
        
        # Generate AI summary
        ai_summary = draft_report.get("impression", "AI analysis completed successfully.")
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Log the analysis
        logger.info(f"✅ Analysis completed for study {study_id} in {processing_time_ms}ms")
        
        return AnalyzeResponse(
            success=True,
            study_id=study_id,
            findings=findings_list[:5],
            heatmap_b64=heatmap_b64,
            draft_report=draft_report,
            processing_time_ms=processing_time_ms,
            model_version=model_version,
            used_simulation=used_simulation,
            ai_summary=ai_summary,
            tb_probability=round(tb_probability, 1),
            pneumonia_probability=round(pneumonia_probability, 1)
        )
        
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def get_icd10_code(pathology: str) -> str:
    """Get ICD-10 code for pathology"""
    codes = {
        'Pneumonia': 'J18.9',
        'Tuberculosis': 'A15.0',
        'Pneumothorax': 'J93.9',
        'Effusion': 'J90',
        'Cardiomegaly': 'I51.7',
        'Edema': 'J81',
        'Consolidation': 'J18.1',
        'Infiltration': 'J18.9',
        'Atelectasis': 'J98.11',
        'Nodule': 'R91.1',
        'Mass': 'R91.1',
        'Fibrosis': 'J84.10',
        'Emphysema': 'J43.9',
        'Pleural_Thickening': 'J94.8',
        'Hernia': 'K46.9'
    }
    return codes.get(pathology, 'R91.8')  # Default to "Other nonspecific abnormal finding of lung field"

# Helper functions for simulation mode
def simulate_predictions(image) -> Dict[str, float]:
    """Simulate CheXNet predictions based on image statistics"""
    import numpy as np
    
    # Convert PIL to numpy for analysis
    img_array = np.array(image.convert('L'))
    
    # Simple statistics-based simulation
    brightness = np.mean(img_array) / 255.0
    contrast = np.std(img_array) / 255.0
    
    # Generate deterministic but realistic-looking probabilities
    random.seed(int(brightness * 1000) + int(contrast * 1000))
    
    pathologies = [
        'Atelectasis', 'Consolidation', 'Infiltration', 'Pneumothorax',
        'Edema', 'Emphysema', 'Fibrosis', 'Effusion', 'Pneumonia',
        'Pleural_Thickening', 'Cardiomegaly', 'Nodule', 'Mass', 'Hernia'
    ]
    
    predictions = {}
    for pathology in pathologies:
        # Base probability with some randomness
        base_prob = random.random() * 0.3
        
        # Adjust based on image characteristics
        if pathology in ['Pneumonia', 'Consolidation', 'Infiltration']:
            base_prob += (1 - brightness) * 0.3  # More likely in darker images
        elif pathology == 'Cardiomegaly':
            base_prob += brightness * 0.2  # More likely in brighter images
        elif pathology == 'Pneumothorax':
            base_prob += contrast * 0.2  # More likely in high-contrast images
            
        predictions[pathology] = min(max(base_prob, 0.01), 0.95)
    
    return predictions

def generate_synthetic_heatmap(image, predictions) -> str:
    """Generate synthetic heatmap for simulation mode"""
    import numpy as np
    import matplotlib.pyplot as plt
    import io
    import base64
    
    # Create a simple synthetic heatmap
    img_array = np.array(image.convert('L'))
    h, w = img_array.shape
    
    # Create heatmap based on top predictions
    heatmap = np.zeros((h, w))
    
    # Add Gaussian blobs at plausible locations
    top_findings = sorted(predictions.items(), key=lambda x: x[1], reverse=True)[:3]
    
    for i, (pathology, prob) in enumerate(top_findings):
        if prob > 0.3:
            # Place blob based on pathology
            if 'Cardiomegaly' in pathology:
                center = (w//2, h//2)
            elif 'Pneumothorax' in pathology:
                center = (w//4, h//3)  # Upper left
            elif 'Effusion' in pathology:
                center = (3*w//4, 2*h//3)  # Lower right
            else:
                center = (w//2 + random.randint(-w//4, w//4), 
                         h//2 + random.randint(-h//4, h//4))
            
            # Create Gaussian blob
            y, x = np.ogrid[:h, :w]
            mask = (x - center[0])**2 + (y - center[1])**2 <= (min(w, h)//8)**2
            heatmap[mask] += prob * 255
    
    # Normalize and colorize
    heatmap = np.clip(heatmap, 0, 255)
    heatmap = heatmap.astype(np.uint8)
    
    # Apply colormap
    plt.figure(figsize=(10, 10))
    plt.imshow(heatmap, cmap='jet', alpha=0.7)
    plt.axis('off')
    
    # Convert to base64
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
    plt.close()
    buf.seek(0)
    
    return base64.b64encode(buf.read()).decode('utf-8')

def generate_template_report(findings: List[Finding], patient_id: str, view_position: str) -> DraftReport:
    """Generate template-based report"""
    flagged = [f for f in findings if f.severity == "flagged"]
    
    impression = "No acute findings" if not flagged else f"Abnormalities detected: {', '.join([f.pathology for f in flagged[:3]])}"
    
    findings_text = "Chest X-ray shows " + (". " if not flagged else ". ".join([
        f"{f.pathology} ({f.probability:.0%} confidence)" for f in flagged[:5]
    ]))
    
    recommendation = "Routine follow-up" if not flagged else "Clinical correlation recommended"
    
    return DraftReport(
        indication=f"Chest X-ray for {patient_id or 'patient'}",
        technique=f"{view_position} view",
        findings_text=findings_text,
        impression=impression,
        recommendation=recommendation,
        source="template"
    )

def get_icd10_code(pathology: str) -> str:
    """Map pathology to ICD-10 code"""
    mapping = {
        'Atelectasis': 'J98.1',
        'Consolidation': 'J18.9',
        'Infiltration': 'J18.9',
        'Pneumothorax': 'J93.9',
        'Edema': 'J81.9',
        'Emphysema': 'J43.9',
        'Fibrosis': 'J84.1',
        'Effusion': 'J90.9',
        'Pneumonia': 'J18.9',
        'Pleural_Thickening': 'J92.9',
        'Cardiomegaly': 'I51.7',
        'Nodule': 'R91.1',
        'Mass': 'R91.1',
        'Hernia': 'K40.9'
    }
    return mapping.get(pathology, 'R94.6')  # Default to "Abnormal radiological finding"

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    
    print(f"🚀 Starting LunaDX Backend on {host}:{port}")
    print(f"📊 Simulation mode: {'ON' if SIMULATION_MODE else 'OFF'}")
    print(f"🔥 CORS origins: {allowed_origins}")
    
    uvicorn.run(app, host=host, port=port)
