# Troubleshooting Guide

## "Bad hostname" Error When Cloning

This error typically means your Raspberry Pi cannot resolve the GitHub hostname. Here are solutions:

### Solution 1: Check Internet Connection

```bash
# Test internet connectivity
ping -c 4 8.8.8.8

# Test DNS resolution
ping -c 4 google.com

# Test GitHub connectivity
ping -c 4 github.com
```

### Solution 2: Fix DNS Resolution

If `ping github.com` fails, try these steps:

**Option A: Use Google DNS**
```bash
# Edit DNS configuration
sudo nano /etc/resolv.conf
```

Add or replace with:
```
nameserver 8.8.8.8
nameserver 8.8.4.4
```

**Option B: Use systemd-resolved (if available)**
```bash
sudo systemd-resolve --set-dns=8.8.8.8 --interface=eth0
# Or for wlan0:
sudo systemd-resolve --set-dns=8.8.8.8 --interface=wlan0
```

**Option C: Edit NetworkManager config (if using NetworkManager)**
```bash
sudo nano /etc/NetworkManager/NetworkManager.conf
```

Add:
```
[main]
dns=8.8.8.8 8.8.4.4
```

Then restart:
```bash
sudo systemctl restart NetworkManager
```

### Solution 3: Use IP Address Instead of Hostname

If DNS is the issue, you can clone using GitHub's IP address:

```bash
# First, find GitHub's IP (run this on a working machine or use known IPs)
# GitHub's main IP is usually: 140.82.121.3

# Add to /etc/hosts
sudo nano /etc/hosts
```

Add this line:
```
140.82.121.3 github.com
140.82.112.3 codeload.github.com
```

Then try cloning again:
```bash
git clone https://github.com/aezakzedd/pathfinder-black.git
```

### Solution 4: Use SSH Instead of HTTPS

If HTTPS is blocked, try SSH:

```bash
# First, generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add this key to your GitHub account:
# GitHub -> Settings -> SSH and GPG keys -> New SSH key

# Then clone using SSH
git clone git@github.com:aezakzedd/pathfinder-black.git
```

### Solution 5: Check Proxy Settings

If you're behind a proxy:

```bash
# Set proxy (if needed)
export http_proxy=http://proxy.example.com:8080
export https_proxy=http://proxy.example.com:8080

# Or configure git
git config --global http.proxy http://proxy.example.com:8080
git config --global https.proxy http://proxy.example.com:8080
```

### Solution 6: Verify Git is Installed

```bash
# Check if git is installed
git --version

# If not installed:
sudo apt update
sudo apt install -y git
```

### Solution 7: Alternative - Download as ZIP

If cloning still doesn't work, download as ZIP:

```bash
# Download using wget or curl
cd ~
wget https://github.com/aezakzedd/pathfinder-black/archive/refs/heads/master.zip

# Or using curl
curl -L -o pathfinder-black.zip https://github.com/aezakzedd/pathfinder-black/archive/refs/heads/master.zip

# Extract
unzip master.zip
mv pathfinder-black-master pathfinder-black
cd pathfinder-black
```

**Note:** With ZIP download, you won't be able to use `git pull` later. You'll need to download again for updates.

### Solution 8: Check Firewall

```bash
# Check if firewall is blocking
sudo ufw status

# If firewall is active, allow outbound connections
sudo ufw allow out 80/tcp
sudo ufw allow out 443/tcp
```

### Quick Diagnostic Commands

Run these to diagnose the issue:

```bash
# 1. Check DNS
nslookup github.com

# 2. Check connectivity
curl -I https://github.com

# 3. Check git configuration
git config --list

# 4. Test with verbose output
GIT_CURL_VERBOSE=1 GIT_TRACE=1 git clone https://github.com/aezakzedd/pathfinder-black.git
```

### Most Common Fix

The most common solution is fixing DNS. Try this first:

```bash
# Add Google DNS
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf
echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf

# Flush DNS cache (if systemd-resolved is running)
sudo systemd-resolve --flush-caches

# Test
ping -c 2 github.com

# If ping works, try cloning again
git clone https://github.com/aezakzedd/pathfinder-black.git
```

