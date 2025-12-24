#!/bin/bash
set -e

echo "🚀 Deploying QR-Nonsense to ProxMox..."

# Build Docker image
docker build -t qr-nonsense:latest .

# Stop existing container if running
docker stop qr-nonsense 2>/dev/null || true
docker rm qr-nonsense 2>/dev/null || true

# Start new container
docker run -d \
  --name qr-nonsense \
  -p 80:80 \
  --restart unless-stopped \
  qr-nonsense:latest

echo "✅ Deployment complete! App available at http://<your-proxmox-ip>"

