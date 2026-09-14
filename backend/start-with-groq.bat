@echo off
echo 🏥 LunaDX Backend Setup
echo ================================
echo.

echo 🔑 Groq API Key configured!
echo    GROQ_API_KEY: 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
echo.

echo 📦 Installing dependencies...
call venv\Scripts\activate.bat 2>nul || python -m venv venv && call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt

echo.
echo 📁 Creating models directory...
if not exist models mkdir models

echo.
echo ✅ Setup complete!
echo.
echo 🚀 Starting server...
python main.py

pause
