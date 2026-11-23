@echo off
title Select Clinical Datasets - AI/ML Training
echo ======================================================================
echo AI/ML MODEL TRAINING - WINDOWS FILE PICKER
echo ======================================================================
echo.

set "PY_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=.venv\Scripts\python.exe"
) else if exist "backend\.venv\Scripts\python.exe" (
    set "PY_CMD=backend\.venv\Scripts\python.exe"
)

echo [STEP 1/2] Opening Windows file selector for TRAINING dataset...
echo (Please choose your training .xlsx or .csv file in the popup window)
echo.

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f=New-Object System.Windows.Forms.OpenFileDialog; $f.Title='Select TRAINING Dataset (.xlsx or .csv)'; $f.Filter='Datasets (*.xlsx;*.csv;*.xls)|*.xlsx;*.csv;*.xls|All files (*.*)|*.*'; $f.InitialDirectory = (Get-Item .).FullName; if($f.ShowDialog() -eq 'OK'){ $f.FileName }"`) do set "TRAIN_FILE=%%I"

if "%TRAIN_FILE%"=="" (
    echo [NOTICE] No training file selected. Cancelled.
    pause
    exit /b
)

echo Selected Training File: %TRAIN_FILE%
echo.
echo [STEP 2/2] Opening Windows file selector for TESTING dataset...
echo (Please choose your testing .xlsx or .csv file in the popup window)
echo.

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f=New-Object System.Windows.Forms.OpenFileDialog; $f.Title='Select TESTING Dataset (.xlsx or .csv)'; $f.Filter='Datasets (*.xlsx;*.csv;*.xls)|*.xlsx;*.csv;*.xls|All files (*.*)|*.*'; $f.InitialDirectory = (Get-Item .).FullName; if($f.ShowDialog() -eq 'OK'){ $f.FileName }"`) do set "TEST_FILE=%%I"

if "%TEST_FILE%"=="" (
    echo [NOTICE] No testing file selected. Cancelled.
    pause
    exit /b
)

echo Selected Testing File: %TEST_FILE%
echo.
echo ======================================================================
echo Running Supervised Gradient Optimization:
echo   * Train File: %TRAIN_FILE%
echo   * Test File : %TEST_FILE%
echo ======================================================================
echo.
%PY_CMD% backend/train_model.py --train "%TRAIN_FILE%" --test "%TEST_FILE%"

echo.
echo ======================================================================
echo Training complete! Weights updated in backend/model_artifacts.json
echo ======================================================================
echo Press any key to close...
pause >nul
