"""
LunaDX analyze API — pneumonia (local ViT) and tuberculosis (HF JetX-GT) routes.
Run: uvicorn main:app --port 8000  (from this directory, with venv + deps installed)
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    clinical_notes: Optional[str] = Form(None),
    view_position: str = Form("PA"),
    screening_type: str = Form("pneumonia"),
):
    start = time.time()
    study_id = f"study-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    mode = normalize_screening_type(screening_type)

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
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port)
