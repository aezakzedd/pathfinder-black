@echo off
REM Batch script to run the backend with virtual environment check
REM This ensures we're using Python 3.12.3 from the virtual environment

echo Starting Pathfinder Backend...

REM Check if virtual environment exists
if not exist "venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found!
    echo Please run setup_venv.bat first to create the virtual environment.
    exit /b 1
)

REM Activate virtual environment and run
echo Activating virtual environment...
call venv\Scripts\activate.bat
python run.py

