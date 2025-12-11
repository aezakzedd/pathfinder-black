import sys
import os

# Check if we're running in a virtual environment
venv_python = os.path.join(os.path.dirname(__file__), "venv", "Scripts", "python.exe")
is_venv = (
    hasattr(sys, 'real_prefix') or 
    (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix) or
    sys.executable == venv_python or
    'venv' in sys.executable.lower() or
    'virtualenv' in sys.executable.lower()
)

# Check if required packages are available (verify we're using venv)
try:
    import sqlalchemy
except ImportError:
    if os.path.exists(venv_python):
        print("ERROR: You must use the virtual environment Python!")
        print(f"\nPlease run one of the following:")
        print(f"  1. {venv_python} run.py")
        print(f"  2. .\\venv\\Scripts\\python.exe run.py")
        print(f"  3. Use the launcher: run.bat or run.ps1")
        print(f"\nCurrent Python: {sys.executable}")
        sys.exit(1)
    else:
        print("ERROR: Required packages not found. Please install dependencies:")
        print("  First, create virtual environment: setup_venv.bat or setup_venv.ps1")
        print("  Then install: pip install -r requirements.txt")
        sys.exit(1)

# Warn if not using venv (but allow it if packages are installed)
if not is_venv:
    print("WARNING: Not running in virtual environment!")
    print(f"Current Python: {sys.executable}")
    print("For Python 3.12.3 compatibility, please use the virtual environment.")
    print("Run: setup_venv.bat or setup_venv.ps1 to create it.")
    print("")

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["src"],  # Explicitly watch the src directory
        reload_includes=["*.py"],  # Only reload on Python file changes
    )
