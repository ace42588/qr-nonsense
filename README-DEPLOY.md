# ProxMox Deployment Guide

## Quick Start

1. **Set up ProxMox LXC Container:**
   - Create a new LXC container (Ubuntu 22.04 or Debian 12)
   - Enable Docker support in container options
   - SSH into the container

2. **Clone and Deploy:**
   ```bash
   git clone https://github.com/ace42588/qr-nonsense.git qr-nonsense
   cd qr-nonsense
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Access the Application:**
   - Navigate to `http://<your-proxmox-ip>` in your browser

## Using Docker Compose

```bash
docker-compose up -d
```

## Manual Docker Commands

```bash
# Build
docker build -t qr-nonsense:latest .

# Run
docker run -d --name qr-nonsense -p 80:80 --restart unless-stopped qr-nonsense:latest

# View logs
docker logs -f qr-nonsense

# Stop
docker stop qr-nonsense

# Remove
docker rm qr-nonsense
```

## Custom Port

To use a different port (e.g., 8080), modify `docker-compose.yml`:
```yaml
ports:
  - "8080:80"
```

Or in `deploy.sh`:
```bash
-p 8080:80
```

## HTTPS Setup

For production, consider adding a reverse proxy (Traefik/Caddy) or using ProxMox's built-in proxy features.

