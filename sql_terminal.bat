@echo off
cd /d "%~dp0"
title DrugAI SQLite PowerShell Query CLI
set "PY_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0.venv\Scripts\python.exe"
) else if exist "backend\.venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0backend\.venv\Scripts\python.exe"
)

"%PY_CMD%" backend/sql_cli.py %*
