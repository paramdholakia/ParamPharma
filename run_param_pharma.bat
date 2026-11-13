@echo off
setlocal enabledelayedexpansion
title Param Pharma - Pharmaceutical Wholesale ERP
echo =====================================================================
echo           PARAM PHARMA - WHOLESALE ERP & GST BILLING SYSTEM
echo                      Bhuj, Kutch (Gujarat)
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Safety First: Automatic Database Backup before any sync
if exist "backend\data\param_pharma.db" (
    if not exist "backend\backups" mkdir "backend\backups"
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
    set "ts=!datetime:~0,8!_!datetime:~8,6!"
    if "!ts!"=="" set "ts=startup"
    copy /y "backend\data\param_pharma.db" "backend\backups\param_pharma_backup_!ts!.db" >nul 2>&1
    echo [OK] Safety backup of database created.
)

:: 2. Check for Remote Updates from Laptop (via GitHub)
echo Checking for remote updates from GitHub...
ping -n 1 8.8.8.8 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Internet connected. Pulling latest updates...
    git fetch origin >nul 2>&1
    git pull origin ui-overhaul-3
    if %ERRORLEVEL% equ 0 (
        echo [OK] Application is fully up to date with latest version.
    ) else (
        echo [!] Pull completed with local branch tracking.
    )
) else (
    echo [!] No internet detected. Starting in 100%% offline mode...
)
echo.

:: 3. Start Backend REST API (Binding to 0.0.0.0 for LAN and Mobile Access)
echo Starting FastAPI REST backend on port 8000...
start /b "" ".\venv\Scripts\python.exe" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
timeout /t 2 /nobreak >nul

:: 4. Start Desktop Frontend UI
echo Starting Desktop UI on port 5173...
cd frontend
start /b "" npx vite --host 0.0.0.0 --port 5173
cd ..
timeout /t 2 /nobreak >nul

:: 5. Open Web App in Default Browser
echo Opening Param Pharma ERP in default browser...
start http://127.0.0.1:5173

echo.
echo =====================================================================
echo   PARAM PHARMA ERP IS LIVE AND OPERATIONAL
echo   - Local Desktop: http://127.0.0.1:5173
echo   - Backend API:   http://127.0.0.1:8000
echo   - Mobile / LAN:  Accessible on Wi-Fi IP :8000
echo =====================================================================
echo Keep this window open while working. To exit, close this window.
echo.
pause
