# LunaDX Backend

FastAPI backend for AI-powered chest X-ray analysis.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment (optional):
```bash
cp .env.example .env
# Edit .env with your API keys if desired
```

4. Run the server:
```bash
python main.py
```

The server will start on http://127.0.0.1:8000

## Features

- **DICOM Support**: Parse medical DICOM files and standard images
- **AI Analysis**: CheXNet-based chest X-ray pathology detection
- **Grad-CAM Heatmaps**: Visual explanations of model predictions
- **Smart Reports**: AI-generated radiology reports (template, Groq, or Claude)
- **Simulation Mode**: Works without real ML models for testing

## API Endpoints

### GET /health
Check server status and model availability.

### POST /analyze
Analyze chest X-ray image.

**Parameters:**
- `file`: Image file (DICOM, JPEG, PNG)
- `patient_id`: Optional patient identifier
- `clinical_notes`: Optional clinical context
- `view_position`: X-ray view (PA/AP)

**Response:**
```json
{
  "study_id": "ABC12345",
  "findings": [...],
  "heatmap_b64": "base64-encoded PNG",
  "draft_report": {...},
  "processing_time_ms": 1500,
  "model_version": "CheXNet-DenseNet121",
  "used_simulation": false
}
```

## Configuration

### Environment Variables
- `HOST`: Server host (default: 127.0.0.1)
- `PORT`: Server port (default: 8000)
- `MODEL_PATH`: Path to CheXNet model file
- `SIMULATION_MODE`: Force simulation mode (true/false)
- `GROQ_API_KEY`: For Groq AI reports
- `ANTHROPIC_API_KEY`: For Claude AI reports

### Model Files
Place CheXNet model weights at `models/chexnet.pth` for real inference.
Without the model, the system runs in simulation mode.

## Docker (Optional)

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "main.py"]
```

## Development

The system is designed to gracefully fall back:
1. Tries real AI models if available
2. Falls back to simulation mode
3. Uses template reports if AI APIs fail

This ensures the system always works, even without GPU or API keys.
