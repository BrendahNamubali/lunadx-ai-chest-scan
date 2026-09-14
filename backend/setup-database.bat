@echo off
echo 🚀 Setting up LunaDX Database Backend...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
pip install -r requirements.txt

echo 🗄️ Setting up database...
python database.py

echo.
echo ✅ Database setup complete!
echo.
echo 📋 Default Users Created:
echo    Admin: admin@lunadx.com / admin123
echo    Doctor: doctor@lunadx.com / doctor123  
echo    Clinician: clinician@lunadx.com / clinician123
echo.
echo 🚀 Starting server...
python main.py

pause
