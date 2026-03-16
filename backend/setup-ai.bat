@echo off
echo ========================================
echo  LunaDX AI Setup - CheXNet + Groq
echo ========================================
echo.

echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

echo [2/5] Creating virtual environment...
if not exist venv (
    python -m venv venv
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

echo [3/5] Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip

REM Install PyTorch first (CPU version for compatibility)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

REM Install other dependencies
pip install Pillow numpy requests httpx

echo ✅ Dependencies installed

echo [4/5] Creating models directory...
if not exist models mkdir models

echo [5/5] Downloading CheXNet model weights...
echo This may take a few minutes (100MB download)...
python -c "
import torch
import torchvision.models as models
import torch.nn as nn
import os

# Create DenseNet-121 based CheXNet model
model = models.densenet121(pretrained=True)
model.classifier = nn.Sequential(
    nn.Linear(1024, 512),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(512, 14),
    nn.Sigmoid()
)

# Save the model
os.makedirs('models', exist_ok=True)
torch.save(model.state_dict(), 'models/chexnet.pth')
print('✅ CheXNet model downloaded and saved to models/chexnet.pth')
"

echo.
echo ========================================
echo  ✅ Setup Complete!
echo ========================================
echo.
echo To start the server, run:
echo   start-real-ai.bat
echo.
pause
