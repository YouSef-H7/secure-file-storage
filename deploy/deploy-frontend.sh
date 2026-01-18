
#!/bin/bash
# Install Docker
if ! [ -x "$(command -v docker)" ]; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
fi

# Build and Run
# Note: Update nginx.conf in local before building if backend IP is static
docker build -t vault-frontend ./frontend
docker stop vault-frontend || true
docker rm vault-frontend || true

docker run -d \
  --name vault-frontend \
  --restart unless-stopped \
  -p 80:80 \
  vault-frontend
