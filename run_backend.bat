@echo off
cd /d "%~dp0"
title DrugAI Clinical Backend Service (Port 5000)
echo ======================================================================
echo Starting DrugAI Python Flask Backend Service on port 5000...
echo ======================================================================
echo.

REM Automatically release port 5000 if occupied by an orphan process
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

set "PY_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0.venv\Scripts\python.exe"
) else if exist "backend\.venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0backend\.venv\Scripts\python.exe"
)

echo Using Python environment: %PY_CMD%
echo.
"%PY_CMD%" backend/app.py

echo.
echo Backend server stopped.
pause
