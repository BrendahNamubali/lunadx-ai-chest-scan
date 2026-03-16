@echo off
echo 🚀 Setting up LunaDX Backend with GPU support...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Create virtual environment
echo 📦 Creating virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️ Upgrading pip...
python -m pip install --upgrade pip

REM Install PyTorch with CUDA support
echo 🔥 Installing PyTorch with CUDA support...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

REM Install other dependencies
echo 📚 Installing other dependencies...
pip install -r requirements.txt

REM Create models directory
echo 📁 Creating models directory...
if not exist models mkdir models

echo ✅ Setup complete!
echo.
echo 🎯 Next steps:
echo 1. Get a Groq API key from https://console.groq.com/keys
echo 2. Add it to .env file: GROQ_API_KEY=your_key_here
echo 3. Run the server: python main.py
echo.
echo 🔥 GPU support will be automatically detected if available.

pause
