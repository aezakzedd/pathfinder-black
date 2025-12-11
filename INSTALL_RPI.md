# Installation Guide for Raspberry Pi OS Lite

This guide will help you install the Pathfinder Black project on Raspberry Pi OS Lite using lxterminal in Chromium.

## Prerequisites

Before starting, ensure your Raspberry Pi OS Lite has:
- Internet connection
- Git installed
- Basic development tools

## Step 1: Open Terminal

1. Open Chromium browser on your Raspberry Pi
2. Press `Ctrl+Alt+T` or open lxterminal from the applications menu

## Step 2: Install System Dependencies

```bash
# Update package list
sudo apt update

# Install essential build tools
sudo apt install -y build-essential git curl wget

# Install Python 3.12 and pip
sudo apt install -y python3.12 python3.12-venv python3.12-dev python3-pip

# Install Node.js 18+ (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install additional dependencies for Python packages
sudo apt install -y libpq-dev libssl-dev libffi-dev libjpeg-dev zlib1g-dev

# Install system libraries for WeasyPrint (PDF generation)
sudo apt install -y libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info

# Verify installations
python3.12 --version
node --version
npm --version
```

## Step 3: Clone the Repository

```bash
# Navigate to your desired installation directory (e.g., home directory)
cd ~

# Clone the repository
git clone https://github.com/aezakzedd/pathfinder-black.git

# Navigate into the project directory
cd pathfinder-black
```

## Step 4: Set Up Backend

```bash
# Navigate to backend directory
cd backend

# Create Python 3.12 virtual environment
python3.12 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt

# Note: This may take 10-20 minutes on Raspberry Pi due to PyTorch and other large packages
```

## Step 5: Configure Backend Environment

```bash
# Create .env file for backend
nano .env
```

Add the following content (replace with your actual values):

```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=sqlite:///./iotinerary.db
JWT_SECRET_KEY=your-secret-key-here-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 6: Initialize Database

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Initialize the database
python -m src.init_db
```

## Step 7: Set Up Frontend

```bash
# Navigate to frontend directory (from project root)
cd ~/pathfinder-black/frontend

# Install Node.js dependencies
npm install

# This may take a few minutes
```

## Step 8: Configure Frontend (Optional)

```bash
# Create .env file for frontend (optional)
nano .env
```

Add the following (adjust IP if needed):

```env
VITE_API_URL=http://localhost:8000/api
```

If you're accessing from another device on the network, use your Pi's IP:
```env
VITE_API_URL=http://YOUR_PI_IP:8000/api
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 9: Running the Application

### Terminal 1 - Backend Server

```bash
cd ~/pathfinder-black/backend
source venv/bin/activate
python run.py
```

The backend will run on `http://localhost:8000`

### Terminal 2 - Frontend Server

```bash
cd ~/pathfinder-black/frontend
npm run dev
```

The frontend will run on `http://localhost:5173`

## Step 10: Access the Application

Open Chromium and navigate to:
- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`

## Troubleshooting

### Python 3.12 Not Found
```bash
# If Python 3.12 is not available, you may need to compile it from source
# Or use the latest Python 3.x available:
python3 --version
# Then use: python3 -m venv venv
```

### Out of Memory Errors
If you encounter memory issues during installation:
```bash
# Increase swap space temporarily
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### PyTorch Installation Issues
PyTorch may not have ARM builds for all versions. You may need to:
```bash
# Install PyTorch for ARM
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### Port Already in Use
If ports 8000 or 5173 are already in use:
```bash
# Find what's using the port
sudo lsof -i :8000
sudo lsof -i :5173

# Kill the process or change ports in run.py and vite.config.js
```

### Firebase Service Account
You'll need to add your Firebase service account JSON file:
```bash
cd ~/pathfinder-black/backend
# Place your firebase-service-account.json file here
# It's already in .gitignore, so it won't be committed
```

## Quick Start Script

You can create a startup script for convenience:

```bash
# Create startup script
nano ~/start-pathfinder.sh
```

Add:
```bash
#!/bin/bash
cd ~/pathfinder-black/backend
source venv/bin/activate
python run.py
```

Make it executable:
```bash
chmod +x ~/start-pathfinder.sh
```

## Updating the Project

To update the project later:

```bash
cd ~/pathfinder-black
git pull origin master

# Update backend dependencies if needed
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Update frontend dependencies if needed
cd ../frontend
npm install
```

## Notes for Raspberry Pi

- **Performance**: The first run may be slow as models are downloaded and initialized
- **Memory**: Ensure you have at least 2GB RAM (4GB recommended)
- **Storage**: The project requires several GB of space for dependencies
- **Network**: Keep internet connection active for initial setup and model downloads

