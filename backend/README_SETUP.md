# Backend Setup Instructions

This backend requires **Python 3.12.3** to run the AI model. Your global Python is 3.14, which is incompatible.

## Quick Start

### Option 1: Install Python 3.12.3 Locally (Recommended)

This installs Python 3.12.3 **only in this project**, without affecting your global Python installation.

**Windows PowerShell:**
```powershell
# Step 1: Install Python 3.12.3 locally using pyenv-win
.\setup_python_local.ps1

# Step 2: Create virtual environment
.\setup_venv.ps1
```

**Windows Command Prompt:**
```cmd
# Step 1: Install Python 3.12.3 locally using pyenv-win
setup_python_local.bat

# Step 2: Create virtual environment
setup_venv.bat
```

### Option 2: Use Existing Python 3.12.3 Installation

If you already have Python 3.12.3 installed globally:

**Windows PowerShell:**
```powershell
.\setup_venv.ps1
```

**Windows Command Prompt:**
```cmd
setup_venv.bat
```

The setup scripts will:
- Check for Python 3.12.3 installation (local or global)
- Create a virtual environment in `venv/`
- Install all required dependencies

### 2. Run the Backend

**Windows PowerShell:**
```powershell
.\run.ps1
```

**Windows Command Prompt:**
```cmd
run.bat
```

**Or manually:**
```cmd
venv\Scripts\activate.bat
python run.py
```

## Manual Setup (if scripts don't work)

### Install Python 3.12.3 Locally (Recommended)

1. **Install pyenv-win** (Python version manager for Windows):
   ```powershell
   # In PowerShell (as Administrator)
   Invoke-WebRequest -UseBasicParsing -Uri https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1 -OutFile install-pyenv-win.ps1
   .\install-pyenv-win.ps1
   ```

2. **Install Python 3.12.3 locally** (in project directory):
   ```cmd
   pyenv install 3.12.3
   pyenv local 3.12.3
   ```

### Or Install Python 3.12.3 Globally

1. **Download and install Python 3.12.3**:
   - Download from: https://www.python.org/downloads/
   - **Important**: During installation, check "Add Python to PATH"
   - Or install to a custom location and add manually

2. **Create virtual environment:**
   ```cmd
   python3.12 -m venv venv
   ```
   Or if using py launcher:
   ```cmd
   py -3.12 -m venv venv
   ```

3. **Activate virtual environment:**
   ```cmd
   venv\Scripts\activate.bat
   ```

4. **Install dependencies:**
   ```cmd
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Run the backend:**
   ```cmd
   python run.py
   ```

## Environment Variables

Create a `.env` file in the `backend/` directory with:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Troubleshooting

### "Python 3.12.3 not found"
- **Recommended**: Run `setup_python_local.ps1` to install Python 3.12.3 locally (doesn't affect global Python)
- Or install Python 3.12.3 globally from https://www.python.org/downloads/
- Or use pyenv-win: `pyenv install 3.12.3` then `pyenv local 3.12.3`

### "pyenv-win installation failed"
- Make sure you're running PowerShell as Administrator
- Or install pyenv-win manually: https://github.com/pyenv-win/pyenv-win#installation
- You may need Visual Studio Build Tools for compiling Python

### "Virtual environment not found"
- Run `setup_venv.ps1` or `setup_venv.bat` first

### "Module not found" errors
- Make sure the virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### ChromaDB errors
- The first run will download and set up ChromaDB
- This may take a few minutes

## Notes

- The virtual environment uses Python 3.12.3 specifically for AI model compatibility
- Always activate the virtual environment before running the backend
- The backend will run on `http://localhost:8000` by default

