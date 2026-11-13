@echo off
setlocal enabledelayedexpansion
title Param Pharma - First Time Machine Setup
echo =====================================================================
echo        PARAM PHARMA - FIRST TIME INSTALLER & SETUP WIZARD
echo                      Bhuj, Kutch (Gujarat)
echo =====================================================================
echo.

cd /d "%~dp0"

:: Step 1: Check Python
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org and check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)
python --version

:: Step 2: Check Node.js
echo.
echo [2/6] Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js LTS from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
node --version

:: Step 3: Check Git
echo.
echo [3/6] Checking Git installation...
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Git is not installed. Remote updates from laptop will require Git.
    echo Recommendation: Install Git for Windows from https://git-scm.com/
) else (
    git --version
)

:: Step 4: Setup Python Virtual Environment
echo.
echo [4/6] Setting up Python virtual environment (venv)...
if not exist "venv" (
    python -m venv venv
    echo       Virtual environment created.
) else (
    echo       Existing virtual environment found.
)
echo       Installing backend dependencies (FastAPI, SQLite, ReportLab, etc.)...
call ".\venv\Scripts\pip.exe" install --upgrade pip --quiet
call ".\venv\Scripts\pip.exe" install -r requirements.txt --quiet
echo [OK] Backend environment is ready.

:: Step 5: Setup Frontend
echo.
echo [5/6] Setting up Desktop Web Frontend...
cd frontend
call npm install --prefer-offline --no-audit --no-fund
cd ..
echo [OK] Frontend packages installed.

:: Step 6: Initialize Database & Create Desktop Shortcut
echo.
echo [6/6] Initializing database & creating Desktop Shortcut...
if not exist "backend\data" mkdir "backend\data"
if not exist "backend\backups" mkdir "backend\backups"

:: Run initial migration/seed if database doesn't exist
if not exist "backend\data\param_pharma.db" (
    echo Initializing database schema and seed data...
    .\venv\Scripts\python.exe -m backend.app.seed
) else (
    echo [OK] Existing database found. Preserving all records.
)

:: Create Desktop Shortcut using PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Param Pharma ERP.lnk')); $s.TargetPath = [System.IO.Path]::Combine('%~dp0', 'run_param_pharma.bat'); $s.WorkingDirectory = '%~dp0'; $s.Description = 'Param Pharma Wholesale ERP'; $s.Save()" >nul 2>&1
echo [OK] Created 'Param Pharma ERP' shortcut on Desktop!

echo.
echo =====================================================================
echo              SETUP COMPLETE! PARAM PHARMA IS READY
echo =====================================================================
echo.
echo A shortcut named "Param Pharma ERP" has been placed on your Desktop.
echo Your father can now launch the software directly from that icon.
echo.
set /p launch="Would you like to launch Param Pharma now? (Y/N): "
if /i "%launch%"=="Y" (
    start "" "%~dp0run_param_pharma.bat"
)
exit /b 0
