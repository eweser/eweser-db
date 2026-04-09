#!/usr/bin/env bash
# EweserDB VPS setup script
# Installs Docker, clones the repo, generates secrets, and starts the stack.
# Tested on Ubuntu 22.04 / 24.04.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/eweser/eweser-db/main/scripts/setup-vps.sh | bash
#
# Or with a custom domain:
#   DOMAIN=yourdomain.com bash <(curl -fsSL https://...)

set -euo pipefail

REPO_URL="https://github.com/eweser/eweser-db.git"
INSTALL_DIR="${INSTALL_DIR:-/opt/eweser-db}"
DOMAIN="${DOMAIN:-}"

echo "=== EweserDB VPS Setup ==="

# --- Docker ---
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$USER" || true
  echo "Docker installed. You may need to log out and back in for group changes to take effect."
fi

if ! docker compose version &>/dev/null 2>&1; then
  echo "ERROR: docker compose plugin not found. Please install Docker >= 23." >&2
  exit 1
fi

# --- Clone ---
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating existing repo at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "Cloning eweser-db to $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# --- Environment ---
if [ ! -f .env ]; then
  cp .env.example .env

  # Generate secrets
  SERVER_SECRET=$(openssl rand -hex 32)
  BETTER_AUTH_SECRET=$(openssl rand -hex 32)
  SYNC_AUTH_SECRET=$(openssl rand -hex 32)
  WEBHOOK_SECRET=$(openssl rand -hex 32)
  POSTGRES_PASSWORD=$(openssl rand -hex 24)

  sed -i "s|SERVER_SECRET=.*|SERVER_SECRET=${SERVER_SECRET}|" .env
  sed -i "s|BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}|" .env
  sed -i "s|SYNC_AUTH_SECRET=.*|SYNC_AUTH_SECRET=${SYNC_AUTH_SECRET}|" .env
  sed -i "s|WEBHOOK_SECRET=.*|WEBHOOK_SECRET=${WEBHOOK_SECRET}|" .env
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" .env

  if [ -n "$DOMAIN" ]; then
    sed -i "s|DOMAIN=.*|DOMAIN=${DOMAIN}|" .env
    sed -i "s|AUTH_PUBLIC_URL=.*|AUTH_PUBLIC_URL=https://${DOMAIN}|" .env
    sed -i "s|SYNC_PUBLIC_URL=.*|SYNC_PUBLIC_URL=wss://${DOMAIN}/sync|" .env
  else
    # Use server IP as fallback
    SERVER_IP=$(curl -fsSL https://icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}')
    echo ""
    echo "No DOMAIN set. Using IP: $SERVER_IP"
    echo "For HTTPS you'll need a domain. Set DOMAIN=yourdomain.com in .env and re-run."
    sed -i "s|DOMAIN=.*|DOMAIN=${SERVER_IP}|" .env
  fi

  echo ""
  echo "Generated .env with random secrets. Review it at: $INSTALL_DIR/.env"
fi

# --- Start ---
echo ""
echo "Starting EweserDB..."
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Done! ==="
if [ -n "$DOMAIN" ]; then
  echo "Your EweserDB instance will be live at: https://${DOMAIN}"
  echo "(Allow 1-2 minutes for Caddy to provision a TLS certificate)"
else
  SERVER_IP=$(curl -fsSL https://icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}')
  echo "Your EweserDB instance is running at: http://${SERVER_IP}"
fi
echo ""
echo "Check status:  docker compose -f $INSTALL_DIR/docker-compose.prod.yml ps"
echo "View logs:     docker compose -f $INSTALL_DIR/docker-compose.prod.yml logs -f"
