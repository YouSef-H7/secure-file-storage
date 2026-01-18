#!/bin/bash
set -e

echo "[OCI SETUP] Deploying Frontend Node..."

# 1. Update and Dependencies
sudo apt-get update
sudo apt-get install -y curl nginx git

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Build SPA
cd "$(dirname "$0")/../frontend"
npm install
npm run build

# 4. Deploy to Nginx Path
sudo mkdir -p /var/www/app
sudo cp -r dist/* /var/www/app/
sudo chown -R www-data:www-data /var/www/app

# 5. Configure Nginx
# Note: Ensure you've updated nginx.conf with VM1 Internal IP
sudo cp nginx.conf /etc/nginx/sites-available/secure-storage
sudo ln -sf /etc/nginx/sites-available/secure-storage /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 6. Finalize
sudo nginx -t
sudo systemctl restart nginx

echo "[OCI SETUP] Frontend live on port 80."