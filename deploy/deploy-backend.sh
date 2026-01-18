
#!/bin/bash
# Install Docker if missing
if ! [ -x "$(command -v docker)" ]; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
fi

# Setup data directory
sudo mkdir -p /data/uploads /data/db
sudo chown -R $USER:$USER /data

# Build and Run
docker build -t vault-backend ./backend
docker stop vault-backend || true
docker rm vault-backend || true

docker run -d \
  --name vault-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -e DATA_DIR=/data \
  -v /data:/data \
  vault-backend
