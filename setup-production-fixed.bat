@echo off
echo Setting up LunaDX Production Environment...

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11 from: https://www.python.org/downloads/release/python-3119/
    pause
    exit /b 1
)

echo Creating virtual environment...
python -m venv lunadx_env

echo Activating virtual environment...
call lunadx_env\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing production dependencies...
pip install fastapi==0.104.1 uvicorn==0.24.0 sqlalchemy==2.0.23 alembic==1.12.1 python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4 pydantic==2.5.0 python-dotenv==1.0.0 httpx==0.25.2

echo Setting up database...
cd backend
python database.py

echo.
echo Production environment setup complete!
echo.
echo Environment Details:
echo    Virtual Environment: lunadx_env
echo    Python: Using venv Python
echo    Database: PostgreSQL ready
echo    Default Users: Created in database
echo.
echo To start the server:
echo    1. Activate environment: lunadx_env\Scripts\activate.bat
echo    2. Start server: python main.py
echo.
echo Server will run on: http://127.0.0.1:8000
echo API Docs: http://127.0.0.1:8000/docs
echo.

set /p start=Start server now? (y/n): 
if /i "%start%"=="y" (
    echo Starting LunaDX server...
    python main.py
) else (
    echo Environment is ready. Run 'lunadx_env\Scripts\activate.bat' to activate.
)

pause
