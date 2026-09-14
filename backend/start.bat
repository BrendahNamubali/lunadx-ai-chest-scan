@echo off
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Starting LunaDX Backend...
python main.py

pause
