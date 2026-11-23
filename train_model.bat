@echo off
setlocal enabledelayedexpansion
title AI/ML Model Training Pipeline - Personalized Drug Effect Prediction
echo ======================================================================
echo AI/ML MODEL TRAINING AND TESTING PIPELINE
echo Universal Format Support: .xlsx, .xls, .csv, .tsv
echo Supports Separate Train and Test Datasets
echo ======================================================================
echo.

set "PY_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=.venv\Scripts\python.exe"
) else if exist "backend\.venv\Scripts\python.exe" (
    set "PY_CMD=backend\.venv\Scripts\python.exe"
)

REM 1. Check if two files were provided (e.g. dragged and dropped or passed as arguments)
if not "%~1"=="" if not "%~2"=="" (
    echo [DETECTED] Two files provided:
    echo   * Train File: %~1
    echo   * Test File : %~2
    echo.
    echo Running training on Train dataset and evaluating on Test dataset...
    %PY_CMD% backend/train_model.py --train "%~1" --test "%~2"
    goto finish
)

REM 2. Check if a single file or custom CLI flags were provided
if not "%~1"=="" (
    echo [DETECTED] Arguments provided: %*
    %PY_CMD% backend/train_model.py %*
    goto finish
)

REM 3. Non-blocking automated execution (No terminal typing required!)
echo [AUTO-START] Executing model training with recommended datasets:
echo   * Train File: backend/dataset/clinical_drug_train.xlsx (Excel)
echo   * Test File : backend/dataset/clinical_drug_test.csv  (CSV)
echo.
echo TIP:
echo   - To train on your own files: drag and drop them onto train_model.bat
echo   - Or use train_with_file_picker.bat to browse and select files with a Windows popup
echo.
echo Starting training process...
echo.
%PY_CMD% backend/train_model.py --train "backend/dataset/clinical_drug_train.xlsx" --test "backend/dataset/clinical_drug_test.csv"

:finish
echo.
echo ======================================================================
echo Training complete! Updated model weights saved to backend/model_artifacts.json
echo The running Flask backend will automatically use the updated weights.
echo ======================================================================
echo Press any key to exit...
pause >nul
