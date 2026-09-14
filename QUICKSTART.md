# Quick Start Guide

## Backend Setup

1. **Install Python** (if not already installed)
   - Download from https://python.org (version 3.8+)
   - Make sure to check "Add Python to PATH" during installation

2. **Install Dependencies**
   ```cmd
   cd backend
   pip install -r requirements.txt
   ```

3. **Start Backend Server**
   ```cmd
   python main.py
   ```
   Or simply run:
   ```cmd
   start.bat
   ```

4. **Verify Backend is Running**
   - Open http://127.0.0.1:8000/health in your browser
   - You should see: `{"status": "healthy", ...}`

## Frontend Setup

The frontend should already be running from our previous setup. If not:

1. **Install Dependencies**
   ```cmd
   npm install
   ```

2. **Start Frontend**
   ```cmd
   npm run dev
   ```

## Testing the Full System

1. **Open Frontend**: http://localhost:8080
2. **Login with demo account**:
   - Email: admin@lunadx.com
   - Password: admin123
3. **Upload an X-ray image** (JPG/PNG)
4. **View AI analysis results**

## What's Working

✅ **Frontend**: Complete React app with authentication, patient management, upload interface  
✅ **Backend**: FastAPI server with full analysis pipeline  
✅ **Image Processing**: DICOM and standard image support  
✅ **AI Simulation**: Realistic pathology predictions  
✅ **Heatmaps**: Visual explanation overlays  
✅ **Reports**: Structured radiology reports  

## Next Steps (Optional)

1. **Get Real AI Models**:
   - Download CheXNet weights to `models/chexnet.pth`
   - Set `SIMULATION_MODE=false` in `.env`

2. **Add AI Report Generation**:
   - Get Groq API key (free): https://groq.com
   - Add `GROQ_API_KEY=your_key` to `.env`

3. **Production Deployment**:
   - Add HTTPS
   - Set up proper database
   - Add authentication

## Troubleshooting

**Backend won't start**: 
- Make sure Python is installed and in PATH
- Run `pip install -r requirements.txt` first

**Frontend can't connect to backend**:
- Make sure backend is running on port 8000
- Check CORS settings in `.env`

**No AI results**:
- System works in simulation mode by default
- This is normal and expected for testing
