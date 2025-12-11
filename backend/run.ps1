# PowerShell script to run the backend with virtual environment check
# This ensures we're using Python 3.12.3 from the virtual environment

$ErrorActionPreference = "Stop"

Write-Host "Starting Pathfinder Backend..." -ForegroundColor Cyan

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run setup_venv.ps1 first to create the virtual environment." -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment and run
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& .\venv\Scripts\python.exe run.py

