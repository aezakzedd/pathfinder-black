@echo off
REM Batch script to set up Python 3.12.3 virtual environment for backend
REM This script creates a virtual environment using Python 3.12.3

echo Setting up Python 3.12.3 virtual environment for backend...

REM Try to use pyenv local Python first (if available)
set PYENV_ROOT=%USERPROFILE%\.pyenv\pyenv-win
if exist "%PYENV_ROOT%\shims\python.bat" (
    set PATH=%PYENV_ROOT%\bin;%PYENV_ROOT%\shims;%PATH%
    if exist ".python-version" (
        echo Found local Python version from pyenv
        set PYTHON_CMD=python
        goto :check_version
    )
)

REM Check if Python 3.12.3 is available
python3.12 --version >nul 2>&1
if %errorlevel% neq 0 (
    py -3.12 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Python 3.12.3 not found!
        echo Please run: setup_python_local.bat
        echo This will install Python 3.12.3 locally using pyenv-win
        echo Or install Python 3.12.3 from https://www.python.org/downloads/
        exit /b 1
    )
    set PYTHON_CMD=py -3.12
) else (
    set PYTHON_CMD=python3.12
)

:check_version
REM Check Python version
echo Checking Python version...
%PYTHON_CMD% --version

REM Remove existing venv if it exists
if exist "venv" (
    echo Removing existing virtual environment...
    rmdir /s /q venv
)

REM Create virtual environment
echo Creating virtual environment with Python 3.12.3...
%PYTHON_CMD% -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    exit /b 1
)

echo Virtual environment created successfully!

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo Installing requirements...
pip install -r requirements.txt

echo.
echo Setup complete! To activate the virtual environment, run:
echo   venv\Scripts\activate.bat
echo.
echo Or use the run script: run.bat

