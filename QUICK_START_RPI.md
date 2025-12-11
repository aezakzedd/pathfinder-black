# Quick Start Guide - Raspberry Pi OS Lite

## Fastest Installation Method

### Option 1: Automated Script (Recommended)

1. **Open lxterminal in Chromium** (Ctrl+Alt+T)

2. **Download and run the installation script:**
   ```bash
   cd ~
   wget https://raw.githubusercontent.com/aezakzedd/pathfinder-black/master/install_rpi.sh
   chmod +x install_rpi.sh
   ./install_rpi.sh
   ```

   Or if you've already cloned the repo:
   ```bash
   cd ~/pathfinder-black
   chmod +x install_rpi.sh
   ./install_rpi.sh
   ```

### Option 2: Manual Installation

1. **Clone the repository:**
   ```bash
   cd ~
   git clone https://github.com/aezakzedd/pathfinder-black.git
   cd pathfinder-black
   ```

2. **Install dependencies:**
   ```bash
   # System packages
   sudo apt update
   sudo apt install -y build-essential git python3.12 python3.12-venv python3-pip nodejs npm
   
   # Backend setup
   cd backend
   python3.12 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Frontend setup
   cd ../frontend
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Edit backend/.env
   nano backend/.env
   # Add your GEMINI_API_KEY
   ```

4. **Run the application:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   source venv/bin/activate
   python run.py
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## Using Git Pull (After Initial Clone)

If you've already cloned the repository and want to update:

```bash
cd ~/pathfinder-black
git pull origin master

# Update backend dependencies if requirements.txt changed
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Update frontend dependencies if package.json changed
cd ../frontend
npm install
```

## Common Commands

### Start Backend
```bash
cd ~/pathfinder-black/backend
source venv/bin/activate
python run.py
```

### Start Frontend
```bash
cd ~/pathfinder-black/frontend
npm run dev
```

### Check Status
```bash
# Check if backend is running
curl http://localhost:8000/api/health

# Check if frontend is running
curl http://localhost:5173
```

## Troubleshooting

### "git pull" says "already up to date"
- This means your local copy matches the remote. You're good!

### "git pull" fails
- Check internet connection: `ping github.com`
- Check git remote: `git remote -v`
- Try: `git fetch origin` then `git pull origin master`

### Python version issues
```bash
# Check Python version
python3.12 --version

# If not available, use python3
python3 --version
# Then use: python3 -m venv venv
```

### Port conflicts
```bash
# Find what's using port 8000
sudo lsof -i :8000

# Kill process if needed
sudo kill -9 <PID>
```

## Access from Other Devices

If you want to access from another device on your network:

1. Find your Pi's IP address:
   ```bash
   hostname -I
   ```

2. Update frontend/.env:
   ```env
   VITE_API_URL=http://YOUR_PI_IP:8000/api
   ```

3. Start backend with host binding:
   ```bash
   # Edit backend/run.py or use:
   uvicorn src.main:app --host 0.0.0.0 --port 8000
   ```

4. Access from other device:
   - Frontend: `http://YOUR_PI_IP:5173`
   - Backend: `http://YOUR_PI_IP:8000`

