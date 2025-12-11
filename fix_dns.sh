#!/bin/bash

# Quick DNS Fix Script for Raspberry Pi
# This script fixes common DNS issues that cause "bad hostname" errors

echo "========================================="
echo "DNS Fix Script for GitHub Cloning"
echo "========================================="
echo ""

# Test current connectivity
echo "Testing current connectivity..."
if ping -c 2 github.com &> /dev/null; then
    echo "✓ GitHub is reachable. DNS is working."
    exit 0
else
    echo "✗ Cannot reach GitHub. Fixing DNS..."
fi

# Backup current resolv.conf
if [ -f /etc/resolv.conf ]; then
    sudo cp /etc/resolv.conf /etc/resolv.conf.backup
    echo "Backed up /etc/resolv.conf"
fi

# Add Google DNS
echo ""
echo "Adding Google DNS servers..."
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf > /dev/null
echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null

# Add GitHub to /etc/hosts as backup
echo ""
echo "Adding GitHub to /etc/hosts as backup..."
if ! grep -q "github.com" /etc/hosts; then
    echo "140.82.121.3 github.com" | sudo tee -a /etc/hosts > /dev/null
    echo "140.82.112.3 codeload.github.com" | sudo tee -a /etc/hosts > /dev/null
fi

# Flush DNS cache if systemd-resolved is available
if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
    echo ""
    echo "Flushing DNS cache..."
    sudo systemd-resolve --flush-caches 2>/dev/null || true
fi

# Test again
echo ""
echo "Testing connectivity again..."
sleep 2
if ping -c 2 github.com &> /dev/null; then
    echo "✓ SUCCESS! GitHub is now reachable."
    echo ""
    echo "You can now try cloning:"
    echo "  git clone https://github.com/aezakzedd/pathfinder-black.git"
else
    echo "✗ Still cannot reach GitHub."
    echo ""
    echo "Try these additional steps:"
    echo "1. Check your internet connection: ping -c 4 8.8.8.8"
    echo "2. Check if you're behind a proxy"
    echo "3. Try using SSH instead: git clone git@github.com:aezakzedd/pathfinder-black.git"
    echo "4. Or download as ZIP: wget https://github.com/aezakzedd/pathfinder-black/archive/refs/heads/master.zip"
fi

