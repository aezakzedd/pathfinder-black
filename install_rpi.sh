#!/bin/bash

# Pathfinder Black - Raspberry Pi Installation Script
# This script automates the installation process for Raspberry Pi OS Lite

set -e  # Exit on error

echo "========================================="
echo "Pathfinder Black - RPi Installation"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Step 1: Update system
echo -e "${GREEN}[1/8] Updating package list...${NC}"
sudo apt update

# Step 2: Install system dependencies
echo -e "${GREEN}[2/8] Installing system dependencies...${NC}"
sudo apt install -y build-essential git curl wget python3.12 python3.12-venv python3.12-dev python3-pip \
    libpq-dev libssl-dev libffi-dev libjpeg-dev zlib1g-dev \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 shared-mime-info

# Step 3: Install Node.js
echo -e "${GREEN}[3/8] Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${YELLOW}Node.js already installed, skipping...${NC}"
fi

# Step 4: Clone repository (if not already cloned)
echo -e "${GREEN}[4/8] Setting up repository...${NC}"
if [ ! -d "pathfinder-black" ]; then
    if [ -d ".git" ]; then
        echo -e "${YELLOW}Already in repository, skipping clone...${NC}"
        PROJECT_DIR=$(pwd)
    else
        git clone https://github.com/aezakzedd/pathfinder-black.git
        cd pathfinder-black
        PROJECT_DIR=$(pwd)
    fi
else
    cd pathfinder-black
    git pull origin master || echo -e "${YELLOW}Could not pull, continuing...${NC}"
    PROJECT_DIR=$(pwd)
fi

# Step 5: Setup backend
echo -e "${GREEN}[5/8] Setting up backend...${NC}"
cd "$PROJECT_DIR/backend"

# Create virtual environment
if [ ! -d "venv" ]; then
    python3.12 -m venv venv || python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip
echo -e "${YELLOW}Installing Python dependencies (this may take 10-20 minutes)...${NC}"
pip install -r requirements.txt

# Step 6: Setup backend .env
echo -e "${GREEN}[6/8] Configuring backend environment...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << EOF
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=sqlite:///./iotinerary.db
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF
    echo -e "${YELLOW}Created .env file. Please edit it to add your GEMINI_API_KEY${NC}"
    echo -e "${YELLOW}File location: $PROJECT_DIR/backend/.env${NC}"
else
    echo -e "${YELLOW}.env file already exists, skipping...${NC}"
fi

# Initialize database
echo -e "${YELLOW}Initializing database...${NC}"
python -m src.init_db || echo -e "${YELLOW}Database initialization skipped or failed${NC}"

# Step 7: Setup frontend
echo -e "${GREEN}[7/8] Setting up frontend...${NC}"
cd "$PROJECT_DIR/frontend"

# Install Node.js dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing Node.js dependencies (this may take a few minutes)...${NC}"
    npm install
else
    echo -e "${YELLOW}Node modules exist, running npm install to update...${NC}"
    npm install
fi

# Step 8: Create startup scripts
echo -e "${GREEN}[8/8] Creating startup scripts...${NC}"

# Backend startup script
cat > "$PROJECT_DIR/start-backend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/backend"
source venv/bin/activate
python run.py
EOF

# Frontend startup script
cat > "$PROJECT_DIR/start-frontend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/frontend"
npm run dev
EOF

chmod +x "$PROJECT_DIR/start-backend.sh"
chmod +x "$PROJECT_DIR/start-frontend.sh"

echo ""
echo -e "${GREEN}========================================="
echo "Installation Complete!"
echo "=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and add your GEMINI_API_KEY"
echo "2. To start backend:  ./start-backend.sh"
echo "3. To start frontend: ./start-frontend.sh"
echo ""
echo "Or manually:"
echo "  Backend:  cd backend && source venv/bin/activate && python run.py"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Access the application at:"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:8000/docs"
echo ""

