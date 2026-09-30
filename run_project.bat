@echo off
title Optimized Machine Learning Based Personalized Drug Effect Prediction
echo ======================================================================
echo Launching Optimized Personalized Drug Effect Prediction & 3D Visualization
echo ======================================================================

echo [1/2] Starting Python Flask Backend on port 5000...
start "DrugAI Backend (Port 5000)" cmd /k "python backend/app.py"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Vite React Frontend on port 5173...
start "DrugAI Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo ======================================================================
echo Both services are now running!
echo Frontend Portal: http://localhost:5173
echo Backend API:     http://127.0.0.1:5000
echo ======================================================================
pause
