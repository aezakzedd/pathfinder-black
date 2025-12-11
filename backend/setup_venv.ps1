# PowerShell script to set up Python 3.12.3 virtual environment for backend
# This script creates a virtual environment using Python 3.12.3

Write-Host "Setting up Python 3.12.3 virtual environment for backend..." -ForegroundColor Cyan

# Try to use pyenv local Python first (if available)
$pyenvPython = $null
if (Test-Path "$env:USERPROFILE\.pyenv\pyenv-win\shims\python.bat") {
    $pyenvRoot = "$env:USERPROFILE\.pyenv\pyenv-win"
    $env:Path = "$pyenvRoot\bin;$pyenvRoot\shims;$env:Path"
    
    # Check if .python-version file exists (set by pyenv local)
    if (Test-Path ".python-version") {
        $pythonVersion = Get-Content ".python-version" | Select-Object -First 1
        Write-Host "Found local Python version: $pythonVersion" -ForegroundColor Cyan
        $pyenvPython = "python"
    }
}

# Check if Python 3.12.3 is available
$python312 = $null
if ($pyenvPython) {
    # Try pyenv Python first
    $version = & python --version 2>&1
    if ($version -match "3\.12\.3") {
        $python312 = "python"
        Write-Host "Using pyenv Python 3.12.3" -ForegroundColor Green
    }
}

if (-not $python312) {
    # Try system Python 3.12
    $python312 = Get-Command python3.12 -ErrorAction SilentlyContinue
    if (-not $python312) {
        # Try alternative names
        $python312 = Get-Command py -3.12 -ErrorAction SilentlyContinue
        if (-not $python312) {
            Write-Host "ERROR: Python 3.12.3 not found!" -ForegroundColor Red
            Write-Host "Please run: .\setup_python_local.ps1" -ForegroundColor Yellow
            Write-Host "This will install Python 3.12.3 locally using pyenv-win" -ForegroundColor Yellow
            Write-Host "Or install Python 3.12.3 from https://www.python.org/downloads/" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Check Python version
Write-Host "Checking Python version..." -ForegroundColor Cyan
if ($python312 -eq "python") {
    $version = & python --version 2>&1
    $pythonCmd = "python"
} else {
    $version = & python3.12 --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        $version = & py -3.12 --version 2>&1
        $pythonCmd = "py -3.12"
    } else {
        $pythonCmd = "python3.12"
    }
}

if ($version -notmatch "3\.12\.3") {
    Write-Host "WARNING: Python version is not 3.12.3. Found: $version" -ForegroundColor Yellow
    Write-Host "The AI model requires Python 3.12.3." -ForegroundColor Yellow
    Write-Host "Run .\setup_python_local.ps1 to install Python 3.12.3 locally" -ForegroundColor Yellow
    Write-Host "Continue anyway? (y/n)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "y") {
        exit 1
    }
} else {
    Write-Host "Found Python 3.12.3: $version" -ForegroundColor Green
}

# Remove existing venv if it exists
if (Test-Path "venv") {
    Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "venv"
}

# Create virtual environment
Write-Host "Creating virtual environment with Python 3.12.3..." -ForegroundColor Cyan
try {
    if ($pythonCmd) {
        & $pythonCmd -m venv venv
    } elseif (Get-Command python3.12 -ErrorAction SilentlyContinue) {
        python3.12 -m venv venv
    } else {
        py -3.12 -m venv venv
    }
    Write-Host "Virtual environment created successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create virtual environment: $_" -ForegroundColor Red
    exit 1
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& .\venv\Scripts\Activate.ps1

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install requirements
Write-Host "Installing requirements..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "`nSetup complete! To activate the virtual environment, run:" -ForegroundColor Green
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host "`nOr use the run script: .\run.ps1" -ForegroundColor Yellow

