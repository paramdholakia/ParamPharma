@echo off
title Param Pharma - Pharmaceutical Wholesale ERP
echo =====================================================================
echo           PARAM PHARMA - WHOLESALE ERP & GST BILLING SYSTEM
echo =====================================================================
echo Starting local SQLite database (WAL Mode)...
echo Starting FastAPI REST backend on http://127.0.0.1:8000...
echo Starting Desktop UI on http://127.0.0.1:5173...
echo.

cd /d "%~dp0"

start /b "" ".\venv\Scripts\python.exe" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
timeout /t 2 /nobreak >nul

cd frontend
start /b "" npx vite --host 127.0.0.1 --port 5173
timeout /t 2 /nobreak >nul

echo Opening Param Pharma in your default browser...
start http://127.0.0.1:5173

echo.
echo Application is active and running offline.
echo To close, close this window or press Ctrl+C.
pause
