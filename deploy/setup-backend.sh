#!/bin/bash
set -e

echo "[OCI SETUP] Deploying Backend Node..."

# 1. Update and Dependencies
sudo apt-get update
sudo apt-get install -y curl build-essential git

# 2. Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Directories
sudo mkdir -p /data/uploads /data/db
sudo chown -R $USER:$USER /data

# 4. App Setup
cd "$(dirname "$0")/../backend"
npm install
npm run build

# 5. Process Management
sudo npm install -g pm2
pm2 stop secure-api || true
pm2 delete secure-api || true

# 6. Start API
# Note: Ensure .env is populated before this step
pm2 start dist/server.js --name "secure-api" --env production

# 7. Persistence
pm2 startup
pm2 save

echo "[OCI SETUP] Backend terminal active on port 3000."