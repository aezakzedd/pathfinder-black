@echo off
REM Batch script to install Python 3.12.3 locally using pyenv-win
REM This installs Python 3.12.3 in the project directory, not globally

echo Setting up Python 3.12.3 locally in project...

REM Check if pyenv-win is installed
set PYENV_ROOT=%USERPROFILE%\.pyenv\pyenv-win
if not exist "%PYENV_ROOT%\bin\pyenv.bat" (
    echo pyenv-win is not installed. Installing...
    echo.
    echo Please install pyenv-win manually:
    echo   1. Open PowerShell as Administrator
    echo   2. Run: Invoke-WebRequest -UseBasicParsing -Uri https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1 -OutFile install-pyenv-win.ps1
    echo   3. Run: .\install-pyenv-win.ps1
    echo   4. Restart your terminal and run this script again
    echo.
    pause
    exit /b 1
)

REM Add pyenv to PATH
set PATH=%PYENV_ROOT%\bin;%PYENV_ROOT%\shims;%PATH%

REM Check if Python 3.12.3 is already installed
echo Checking for Python 3.12.3...
pyenv versions | findstr "3.12.3" >nul
if %errorlevel% equ 0 (
    echo Python 3.12.3 is already installed!
) else (
    echo Installing Python 3.12.3 (this may take several minutes)...
    echo This will download and compile Python 3.12.3 locally...
    pyenv install 3.12.3
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Python 3.12.3
        echo.
        echo Troubleshooting:
        echo   1. Make sure you have Visual Studio Build Tools installed
        echo   2. Or download Python 3.12.3 manually from python.org
        pause
        exit /b 1
    )
    echo Python 3.12.3 installed successfully!
)

REM Set local Python version for this project
echo Setting Python 3.12.3 as local version for this project...
pyenv local 3.12.3

echo.
echo Python 3.12.3 is now configured locally for this project!
echo You can now run: setup_venv.bat
pause

