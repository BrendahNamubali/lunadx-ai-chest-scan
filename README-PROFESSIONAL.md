# LunaDX AI Chest Scan Platform

A comprehensive AI-powered medical imaging platform for chest X-ray analysis and screening.

## Overview

LunaDX is an advanced medical AI system designed to assist healthcare professionals in the rapid detection and analysis of chest X-ray abnormalities. Built with modern web technologies and powered by state-of-the-art machine learning models, LunaDX provides real-time analysis of chest radiographs for conditions including pneumonia, tuberculosis, and other pulmonary pathologies.

## Features

### 🏥 **Medical AI Analysis**
- **CheXNet Integration**: DenseNet-121 based model trained on NIH ChestX-ray14 dataset
- **14 Pathology Detection**: Comprehensive screening for common chest conditions
- **Real-time Processing**: Analysis completed in under 30 seconds
- **GPU Acceleration**: CUDA support for 10-100x faster inference
- **Confidence Scoring**: Probability-based risk assessment for each finding

### 📊 **Visual Explanations**
- **Grad-CAM Heatmaps**: Visual overlays showing model reasoning
- **Anatomical Localization**: Highlights specific regions of concern
- **Interactive Overlays**: Transparent heatmaps on original X-ray images
- **Color-coded Severity**: Visual indication of confidence levels

### 📋 **Professional Reporting**
- **Structured Reports**: ACR-format radiology reports
- **AI-Powered Generation**: Llama 3.3 70B for clinical narratives
- **ICD-10 Coding**: Automated medical classification codes
- **PDF Export**: Professional report generation and sharing

### 👥 **Clinical Workflow**
- **Patient Management**: Complete patient records and history
- **Multi-role Support**: Admin, Radiologist, Clinician access levels
- **Organization Management**: Multi-facility deployment
- **Audit Trail**: Complete scan history and tracking

### 🔒 **Enterprise Security**
- **Role-based Access**: HIPAA-compliant permission system
- **Secure Storage**: Encrypted patient data handling
- **Audit Logging**: Complete access and modification tracking
- **DICOM Support**: Medical imaging standard compliance

## Technology Stack

### Frontend
- **React 18**: Modern web framework with TypeScript
- **Tailwind CSS**: Professional medical UI design
- **Framer Motion**: Smooth animations and transitions
- **shadcn/ui**: Clinical-grade UI components
- **React Router**: Multi-page application structure

### Backend
- **FastAPI**: High-performance Python web framework
- **PyTorch**: Deep learning inference engine
- **CheXNet**: Medical imaging AI model
- **Grad-CAM**: Visual explanation system
- **Groq API**: Advanced AI report generation

### Infrastructure
- **GPU Support**: CUDA 11.8 acceleration
- **Docker Ready**: Containerized deployment
- **RESTful API**: Standardized integration
- **Real-time Processing**: Sub-second analysis times

## Quick Start

### Prerequisites
- Python 3.8+ with pip
- Node.js 16+ with npm
- CUDA-compatible GPU (optional but recommended)

### Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/lunadx-ai-chest-scan.git
   cd lunadx-ai-chest-scan
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
   pip install -r requirements.txt
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd ..
   npm install
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:8080
   - Backend API: http://127.0.0.1:8000
   - API Documentation: http://127.0.0.1:8000/docs

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
HOST=127.0.0.1
PORT=8000

# AI Services
GROQ_API_KEY=your_groq_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Model Settings
MODEL_PATH=models/chexnet.pth
SIMULATION_MODE=false

# CORS Settings
ALLOW_ORIGINS=["http://localhost:8080", "https://yourdomain.com"]
```

### API Keys

1. **Groq API** (Recommended)
   - Visit https://console.groq.com/keys
   - Create free account
   - Generate API key
   - Add to `.env` file

2. **Anthropic Claude** (Alternative)
   - Visit https://console.anthropic.com/
   - Create account and API key
   - Add to `.env` file

## Usage

### 1. User Registration
- Create organization account
- Add healthcare providers
- Set up patient records

### 2. Image Upload
- Select patient from database
- Upload chest X-ray (DICOM/JPG/PNG)
- Add clinical context and notes

### 3. AI Analysis
- Automatic quality assessment
- Real-time AI processing
- Visual heatmap generation
- Professional report creation

### 4. Results Review
- Interactive heatmap viewer
- Detailed pathology breakdown
- Confidence scores and recommendations
- PDF report export

## API Documentation

### Health Check
```http
GET /health
```

### Image Analysis
```http
POST /analyze
Content-Type: multipart/form-data

file: Image file (required)
patient_id: Patient identifier (optional)
clinical_notes: Clinical context (optional)
view_position: X-ray view (PA/AP/LAT)
```

### Response Format
```json
{
  "study_id": "ABC12345",
  "findings": [
    {
      "pathology": "Pneumonia",
      "probability": 0.85,
      "severity": "flagged",
      "icd10_code": "J18.9"
    }
  ],
  "heatmap_b64": "base64-encoded PNG",
  "draft_report": {
    "indication": "...",
    "technique": "...",
    "findings_text": "...",
    "impression": "...",
    "recommendation": "..."
  },
  "processing_time_ms": 1500,
  "model_version": "CheXNet-DenseNet121",
  "used_simulation": false
}
```

## Deployment

### Docker Deployment
```bash
# Build image
docker build -t lunadx-backend .

# Run container
docker run -p 8000:8000 --gpus all lunadx-backend
```

### Production Considerations
- **HTTPS**: Required for medical data
- **Database**: PostgreSQL for production use
- **Authentication**: JWT-based secure sessions
- **Compliance**: HIPAA and medical data regulations
- **Monitoring**: Application and model performance metrics

## Model Information

### CheXNet Architecture
- **Base Model**: DenseNet-121
- **Training Data**: NIH ChestX-ray14 (112,120 frontal view X-rays)
- **Pathologies**: 14 common chest conditions
- **Input Size**: 224×224 RGB images
- **Output**: Multi-label probability scores

### Performance Metrics
- **Sensitivity**: 95%+ target for major pathologies
- **Specificity**: 90%+ average across conditions
- **Processing Time**: <1 second (GPU), <10 seconds (CPU)
- **Memory Usage**: 2GB RAM minimum, 4GB recommended

## Support & Contributing

### Medical Disclaimer
LunaDX is an AI-assisted screening tool and does not provide definitive medical diagnoses. All results must be reviewed and confirmed by qualified healthcare professionals before clinical decision-making.

### Support
- Documentation: https://docs.lunadx.ai
- Issues: https://github.com/your-org/lunadx-ai-chest-scan/issues
- Contact: support@lunadx.ai

### Contributing
We welcome contributions from the medical AI community. Please see CONTRIBUTING.md for guidelines.

## License

Proprietary medical software license. See LICENSE.md for details.

---

**LunaDX** - Advanced AI for Medical Imaging  
*Empowering healthcare professionals with intelligent chest X-ray analysis*
