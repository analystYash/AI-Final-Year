@echo off
cd /d "%~dp0"
title Optimized Machine Learning Based Personalized Drug Effect Prediction
echo ======================================================================
echo Launching Personalized Drug Effect Prediction and 3D Visualization
echo ======================================================================

REM Free port 5000 if occupied by a previous zombie process
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

set "PY_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0.venv\Scripts\python.exe"
) else if exist "backend\.venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0backend\.venv\Scripts\python.exe"
)

echo [1/2] Starting Python Flask Backend on port 5000...
start "DrugAI Backend (Port 5000)" cmd /k "cd /d "%~dp0" && "%PY_CMD%" backend/app.py"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Vite React Frontend on port 5173...
start "DrugAI Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ======================================================================
echo Both services are now running!
echo Frontend Portal: http://localhost:5173
echo Backend API:     http://127.0.0.1:5000
echo ======================================================================
pause
