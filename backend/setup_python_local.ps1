# PowerShell script to install Python 3.12.3 locally using pyenv-win
# This installs Python 3.12.3 in the project directory, not globally

Write-Host "Setting up Python 3.12.3 locally in project..." -ForegroundColor Cyan

# Check if pyenv-win is installed
$pyenvPath = "$env:USERPROFILE\.pyenv\pyenv-win\bin\pyenv.bat"
if (-not (Test-Path $pyenvPath)) {
    Write-Host "pyenv-win is not installed. Installing..." -ForegroundColor Yellow
    
    # Install pyenv-win using PowerShell
    $pyenvInstallScript = "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1"
    
    Write-Host "Downloading pyenv-win installer..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $pyenvInstallScript -OutFile "$env:TEMP\install-pyenv-win.ps1"
        Write-Host "Installing pyenv-win..." -ForegroundColor Cyan
        & powershell -ExecutionPolicy Bypass -File "$env:TEMP\install-pyenv-win.ps1"
        
        # Add pyenv to PATH for current session
        $pyenvRoot = "$env:USERPROFILE\.pyenv\pyenv-win"
        $env:Path = "$pyenvRoot\bin;$pyenvRoot\shims;$env:Path"
        
        Write-Host "pyenv-win installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to install pyenv-win automatically." -ForegroundColor Red
        Write-Host "Please install manually:" -ForegroundColor Yellow
        Write-Host "  1. Run: Invoke-WebRequest -UseBasicParsing -Uri https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1 -OutFile install-pyenv-win.ps1" -ForegroundColor Yellow
        Write-Host "  2. Run: .\install-pyenv-win.ps1" -ForegroundColor Yellow
        Write-Host "  3. Restart PowerShell and run this script again" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "pyenv-win found!" -ForegroundColor Green
    # Add pyenv to PATH for current session
    $pyenvRoot = "$env:USERPROFILE\.pyenv\pyenv-win"
    $env:Path = "$pyenvRoot\bin;$pyenvRoot\shims;$env:Path"
}

# Check if Python 3.12.3 is already installed
Write-Host "Checking for Python 3.12.3..." -ForegroundColor Cyan
$python312 = & pyenv versions --bare | Select-String "3.12.3"
if ($python312) {
    Write-Host "Python 3.12.3 is already installed!" -ForegroundColor Green
} else {
    Write-Host "Installing Python 3.12.3 (this may take several minutes)..." -ForegroundColor Cyan
    Write-Host "This will download and compile Python 3.12.3 locally..." -ForegroundColor Yellow
    
    try {
        & pyenv install 3.12.3
        if ($LASTEXITCODE -ne 0) {
            throw "pyenv install failed"
        }
        Write-Host "Python 3.12.3 installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to install Python 3.12.3" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Make sure you have Visual Studio Build Tools installed" -ForegroundColor Yellow
        Write-Host "  2. Or download Python 3.12.3 manually from python.org" -ForegroundColor Yellow
        exit 1
    }
}

# Set local Python version for this project
Write-Host "Setting Python 3.12.3 as local version for this project..." -ForegroundColor Cyan
& pyenv local 3.12.3

Write-Host "`nPython 3.12.3 is now configured locally for this project!" -ForegroundColor Green
Write-Host "You can now run: .\setup_venv.ps1" -ForegroundColor Yellow

