@echo off
echo 🚀 Starting LunaDX Frontend (Demo Mode)...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
npm install

echo.
echo ✅ Frontend setup complete!
echo.
echo 🌐 Starting development server...
echo 📱 Frontend: http://localhost:8080
echo 👥 Default Users (embedded):
echo    Admin: admin@lunadx.com / admin123
echo    Doctor: doctor@lunadx.com / doctor123
echo    Clinician: clinician@lunadx.com / clinician123
echo.

npm run dev

pause
