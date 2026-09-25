"""
LunaDX analyze API — pneumonia (local ViT) and tuberculosis (HF JetX-GT) routes.
Run: uvicorn main:app --port 8000  (from this directory, with venv + deps installed)
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Optional, List
import io
import logging
import os
import time

import numpy as np
import requests
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LunaDX Screening API", version="1.1.0")

DEFAULT_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
EXTRA_ORIGINS = [o.strip() for o in os.getenv("ALLOW_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_ORIGINS + EXTRA_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Access control ────────────────────────────────────────────────────────────
# Every analysis must carry the user's Supabase access token. The paywall rules
# (approved hospital, active profile, valid subscription, monthly scan limit)
# live in the public.scan_access database function, called as the user.
SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").rstrip("/")
SUPABASE_API_KEY = (
    os.getenv("SUPABASE_ANON_KEY")
    or os.getenv("SUPABASE_PUBLISHABLE_KEY")
    or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
    or ""
)

ACCESS_ERRORS = {
    "NOT_AUTHENTICATED": (401, "Please sign in to run a screening."),
    "NO_HOSPITAL": (403, "Your account is not linked to a hospital."),
    "HOSPITAL_NOT_APPROVED": (403, "Your hospital has not been approved yet."),
    "PROFILE_INACTIVE": (403, "Your account is not active. Contact your hospital admin."),
    "SUBSCRIPTION_INACTIVE": (402, "Your hospital's subscription has expired. Ask your hospital admin to renew it."),
    "SCAN_LIMIT_REACHED": (429, "Your hospital has reached its monthly scan limit. Upgrade your plan to continue."),
}


def _access_error(code: str, status: int, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def _bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer ") or not header[7:].strip():
        raise _access_error("NOT_AUTHENTICATED", *ACCESS_ERRORS["NOT_AUTHENTICATED"])
    return header[7:].strip()


def check_scan_access(token: str, record: bool, analysis_type: str) -> dict:
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        logger.error("SUPABASE_URL / SUPABASE_ANON_KEY not configured; refusing to run analysis")
        raise _access_error("ACCESS_CONTROL_UNAVAILABLE", 503, "Screening is temporarily unavailable.")
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/scan_access",
            headers={
                "apikey": SUPABASE_API_KEY,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"p_record": record, "p_analysis_type": analysis_type},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error("scan_access request failed: %s", exc)
        raise _access_error("ACCESS_CONTROL_UNAVAILABLE", 503, "Could not verify your subscription. Please try again.")

    if response.status_code == 200:
        return response.json()

    try:
        message = str(response.json().get("message", ""))
    except ValueError:
        message = ""
    if message in ACCESS_ERRORS:
        raise _access_error(message, *ACCESS_ERRORS[message])
    if response.status_code in (401, 403):
        raise _access_error("NOT_AUTHENTICATED", 401, "Your session has expired. Please sign in again.")
    logger.error("scan_access unexpected response %s: %s", response.status_code, response.text)
    raise _access_error("ACCESS_CONTROL_UNAVAILABLE", 503, "Could not verify your subscription. Please try again.")

PNEUMONIA_MODEL_ID = "lxyuan/vit-xray-pneumonia-classification"
TB_HF_MODEL_ID = "JetX-GT/hades-hellix-tb-linear-probe"

_pneumonia_model = None
_pneumonia_processor = None


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models": {
            "pneumonia": PNEUMONIA_MODEL_ID,
            "tuberculosis": TB_HF_MODEL_ID,
        },
    }


def _validate_xray_image(image: Image.Image) -> None:
    img_array = np.array(image)
    r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]
    color_variance = float(
        np.mean(np.abs(r.astype(int) - g.astype(int)))
        + np.mean(np.abs(g.astype(int) - b.astype(int)))
    )
    if color_variance > 10:
        raise HTTPException(
            status_code=400,
            detail="Image does not appear to be a chest X-ray. Please upload a grayscale X-ray image.",
        )


def get_pneumonia_model():
    global _pneumonia_model, _pneumonia_processor
    if _pneumonia_model is None:
        from transformers import AutoImageProcessor, AutoModelForImageClassification

        _pneumonia_processor = AutoImageProcessor.from_pretrained(PNEUMONIA_MODEL_ID)
        _pneumonia_model = AutoModelForImageClassification.from_pretrained(PNEUMONIA_MODEL_ID)
        _pneumonia_model.eval()
    return _pneumonia_model, _pneumonia_processor


def run_pneumonia_inference(image: Image.Image) -> dict:
    import torch
    import torch.nn.functional as F

    model, processor = get_pneumonia_model()
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits
    probs = F.softmax(logits, dim=-1)[0]
    return {
        "Normal": round(probs[0].item(), 4),
        "Pneumonia": round(probs[1].item(), 4),
    }


def _hf_token() -> str:
    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN") or os.getenv("VITE_HF_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="HF_TOKEN is not configured for tuberculosis inference")
    return token


def _parse_hf_classification(result) -> dict:
    """Normalize HF inference payloads to label -> score in [0,1]."""
    if isinstance(result, dict):
        if "error" in result:
            raise HTTPException(status_code=503, detail=str(result["error"]))
        if "label" in result and "score" in result:
            return {str(result["label"]): float(result["score"])}
        if "labels" in result and "scores" in result:
            return {
                str(l): float(s)
                for l, s in zip(result["labels"], result["scores"])
            }
    if isinstance(result, list) and result:
        parsed = {}
        for item in result:
            if isinstance(item, dict) and "label" in item and "score" in item:
                parsed[str(item["label"])] = float(item["score"])
        if parsed:
            return parsed
    raise HTTPException(status_code=502, detail="Unexpected Hugging Face inference response")


def _tb_probability_from_labels(labels: dict) -> float:
    tb_score = 0.0
    for label, score in labels.items():
        lower = label.lower()
        if "tb" in lower or "tuberc" in lower or lower in ("positive", "abnormal", "disease"):
            if lower not in ("normal", "negative", "no_tb", "not_tb"):
                tb_score = max(tb_score, float(score))
        if lower in ("1", "true", "yes"):
            tb_score = max(tb_score, float(score))
    if tb_score == 0.0:
        # Binary normal vs abnormal: take max non-normal label
        for label, score in labels.items():
            if "normal" not in label.lower() and "negative" not in label.lower():
                tb_score = max(tb_score, float(score))
    return tb_score


def run_tb_inference(image: Image.Image) -> dict:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    response = requests.post(
        f"https://api-inference.huggingface.co/models/{TB_HF_MODEL_ID}",
        headers={"Authorization": f"Bearer {_hf_token()}"},
        data=buffer.getvalue(),
        timeout=120,
    )
    if response.status_code != 200:
        logger.error("TB HF error %s: %s", response.status_code, response.text)
        raise HTTPException(status_code=503, detail="Tuberculosis model unavailable")
    labels = _parse_hf_classification(response.json())
    tb_prob = _tb_probability_from_labels(labels)
    return {
        "Tuberculosis": round(tb_prob, 4),
        "Normal": round(max(0.0, 1.0 - tb_prob), 4),
        "_raw_labels": labels,
    }


def normalize_screening_type(value: str) -> str:
    v = (value or "pneumonia").strip().lower()
    if v in ("tb", "tuberculosis", "tuberculous"):
        return "tuberculosis"
    return "pneumonia"


@app.post("/analyze")
@app.post("/chexpert")
async def analyze_xray(
    request: Request,
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    clinical_notes: Optional[str] = Form(None),
    view_position: str = Form("PA"),
    screening_type: str = Form("pneumonia"),
):
    start = time.time()
    study_id = f"study-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    mode = normalize_screening_type(screening_type)

    token = _bearer_token(request)
    check_scan_access(token, record=False, analysis_type=mode)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    _validate_xray_image(image)

    if mode == "tuberculosis":
        predictions = run_tb_inference(image)
        model_version = TB_HF_MODEL_ID
        tb_probability = predictions.get("Tuberculosis", 0.0) * 100
        pneumonia_probability = 0.0
        ai_summary = (
            f"Tuberculosis screening: {tb_probability:.1f}% probability "
            f"({view_position} view)."
        )
    else:
        predictions = run_pneumonia_inference(image)
        model_version = PNEUMONIA_MODEL_ID
        pneumonia_probability = predictions.get("Pneumonia", 0.0) * 100
        tb_probability = 0.0
        ai_summary = (
            f"Pneumonia screening: {pneumonia_probability:.1f}% probability "
            f"({view_position} view)."
        )

    findings: List[dict] = []
    for pathology, probability in predictions.items():
        if pathology.startswith("_"):
            continue
        if probability > 0.1:
            severity = "High" if probability > 0.7 else "Medium" if probability > 0.4 else "Low"
            findings.append(
                {
                    "label": pathology,
                    "pathology": pathology,
                    "probability": probability,
                    "confidence": probability,
                    "severity": severity,
                    "icd10_code": "A15.9" if pathology == "Tuberculosis" else "J18.9",
                }
            )
    findings.sort(key=lambda x: x["probability"], reverse=True)

    elapsed_ms = int((time.time() - start) * 1000)
    logger.info("✅ %s analysis in %sms — %s", mode, elapsed_ms, predictions)

    usage = None
    try:
        usage = check_scan_access(token, record=True, analysis_type=mode)
    except HTTPException as exc:
        # Access was verified before inference; don't discard a finished result.
        logger.warning("Could not record scan event: %s", exc.detail)

    return {
        "success": True,
        "study_id": study_id,
        "screening_type": mode,
        "findings": findings[:5],
        "heatmap_b64": "",
        "draft_report": {
            "indication": f"{mode.capitalize()} chest X-ray screening — {view_position} view",
            "technique": f"{view_position} chest radiograph",
            "impression": ai_summary,
            "recommendation": clinical_notes or "",
        },
        "processing_time_ms": elapsed_ms,
        "model_version": model_version,
        "ai_summary": ai_summary,
        "tb_probability": round(tb_probability, 1),
        "pneumonia_probability": round(pneumonia_probability, 1),
        "used_simulation": False,
        "usage": usage,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port)
