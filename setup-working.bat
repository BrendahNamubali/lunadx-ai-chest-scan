@echo off
echo Setting up LunaDX Working Environment...

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Installing working dependencies...
python -m pip install fastapi==0.104.1 uvicorn==0.24.0 sqlalchemy==2.0.23 alembic==1.12.1 python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4 pydantic==2.5.0 python-dotenv==1.0.0 httpx==0.25.2

echo Setting up database...
cd backend
python database.py

echo.
echo Working environment setup complete!
echo.
echo To start the server:
echo    python main.py
echo.
echo Server will run on: http://127.0.0.1:8000

python main.py

pause
