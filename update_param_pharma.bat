@echo off
setlocal enabledelayedexpansion
title Param Pharma - Manual Updater
echo =====================================================================
echo         PARAM PHARMA - REMOTE UPDATE & SYNC SYSTEM
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/4] Creating safety backup of database...
if exist "backend\data\param_pharma.db" (
    if not exist "backend\backups" mkdir "backend\backups"
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
    set "ts=!datetime:~0,8!_!datetime:~8,6!"
    if "!ts!"=="" set "ts=manual_update"
    copy /y "backend\data\param_pharma.db" "backend\backups\param_pharma_backup_!ts!.db" >nul
    echo       Safety backup saved to backend\backups\
)

echo [2/4] Pulling latest updates from GitHub...
git fetch --all
git pull origin ui-overhaul-3
if %ERRORLEVEL% neq 0 (
    echo [!] Warning: git pull encountered an issue. Check your git branch or network.
) else (
    echo       Code updated successfully!
)

echo [3/4] Checking Python backend dependencies...
if exist "requirements.txt" (
    call ".\venv\Scripts\pip.exe" install -r requirements.txt --quiet
)

echo [4/4] Checking Frontend dependencies...
cd frontend
call npm install --prefer-offline --no-audit --no-fund
cd ..

echo.
echo =====================================================================
echo   UPDATE COMPLETED! All changes from your laptop are now applied.
echo =====================================================================
echo.
pause
