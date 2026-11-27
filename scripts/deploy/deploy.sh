#!/bin/bash
# ============================================================
# FINEX Forex Trading Platform — Production Deployment Script
# ============================================================
# Usage:
#   ./scripts/deploy/deploy.sh [target]
#   target: docker | pm2 | systemd | nginx  (default: docker)
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARN:${NC} $1"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1" >&2; }

# Detect target
TARGET="${1:-docker}"
VERSION="${APP_VERSION:-2.0.0}"

log "Starting deployment (target: $TARGET, version: $VERSION)"

# 1. Check prerequisites
log "Checking prerequisites..."
case "$TARGET" in
  docker)
    command -v docker >/dev/null 2>&1 || { err "docker not installed"; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { err "docker-compose not installed"; exit 1; }
    ;;
  pm2)
    command -v pm2 >/dev/null 2>&1 || { err "pm2 not installed (npm i -g pm2)"; exit 1; }
    command -v node >/dev/null 2>&1 || { err "node not installed"; exit 1; }
    ;;
  systemd)
    [ "$EUID" -eq 0 ] || { err "systemd target requires root"; exit 1; }
    ;;
  nginx)
    command -v nginx >/dev/null 2>&1 || { err "nginx not installed"; exit 1; }
    ;;
  *)
    err "Unknown target: $TARGET. Use: docker | pm2 | systemd | nginx"
    exit 1
    ;;
esac

# 2. Check .env.production exists
if [ ! -f .env.production ]; then
  err ".env.production not found. Copy .env.production.example and edit:"
  err "  cp .env.production.example .env.production"
  err "  # edit .env.production dengan API keys Anda"
  exit 1
fi

# 3. Generate NEXTAUTH_SECRET if missing
if ! grep -q "^NEXTAUTH_SECRET=.\{16,\}" .env.production; then
  warn "NEXTAUTH_SECRET missing atau terlalu pendek. Generating..."
  SECRET=$(openssl rand -hex 32)
  if grep -q "^NEXTAUTH_SECRET=" .env.production; then
    sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|" .env.production
  else
    echo "NEXTAUTH_SECRET=$SECRET" >> .env.production
  fi
  log "NEXTAUTH_SECRET generated"
fi

# 4. Generate API_KEY_ENCRYPTION_KEY if missing
if ! grep -q "^API_KEY_ENCRYPTION_KEY=.\{32,\}" .env.production; then
  warn "API_KEY_ENCRYPTION_KEY missing. Generating..."
  KEY=$(openssl rand -hex 32)
  if grep -q "^API_KEY_ENCRYPTION_KEY=" .env.production; then
    sed -i "s|^API_KEY_ENCRYPTION_KEY=.*|API_KEY_ENCRYPTION_KEY=$KEY|" .env.production
  else
    echo "API_KEY_ENCRYPTION_KEY=$KEY" >> .env.production
  fi
  log "API_KEY_ENCRYPTION_KEY generated"
fi

# 5. Deploy berdasarkan target
case "$TARGET" in
  docker)
    log "Building Docker image..."
    docker build -t finex-forex:$VERSION .
    docker tag finex-forex:$VERSION finex-forex:latest

    log "Starting containers..."
    docker compose --env-file .env.production up -d

    log "Waiting for healthcheck..."
    sleep 10
    if curl -sf http://localhost:3000/api/health > /dev/null; then
      log "Health check: OK"
    else
      warn "Health check belum siap. Tunggu 30s..."
      sleep 30
      curl -sf http://localhost:3000/api/health > /dev/null && log "Health check: OK" || err "Health check FAILED"
    fi

    log "Logs: docker compose logs -f"
    log "Status: docker compose ps"
    ;;

  pm2)
    log "Installing dependencies..."
    bun install
    (cd mini-services/mt5-bridge && bun install)

    log "Running database migrations..."
    bun run db:push

    log "Building Next.js production..."
    bun run build

    log "Starting with PM2..."
    pm2 start scripts/deploy/ecosystem.config.cjs --env production
    pm2 save
    pm2 startup  # enable on boot

    log "Status: pm2 status"
    log "Logs: pm2 logs"
    ;;

  systemd)
    log "Installing dependencies..."
    bun install
    (cd mini-services/mt5-bridge && bun install)
    bun run db:push
    bun run build

    log "Installing systemd services..."
    cp scripts/deploy/finex-forex.service /etc/systemd/system/
    cp scripts/deploy/finex-bridge.service /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable finex-forex finex-bridge
    systemctl start finex-bridge
    systemctl start finex-forex

    log "Status: systemctl status finex-forex finex-bridge"
    ;;

  nginx)
    log "Installing nginx config..."
    cp scripts/deploy/nginx.conf /etc/nginx/conf.d/finex-forex.conf
    nginx -t && systemctl reload nginx
    log "Nginx reloaded"
    ;;
esac

log "Deployment complete!"
log "  - App URL: $(grep '^NEXT_PUBLIC_APP_URL=' .env.production | cut -d= -f2)"
log "  - Health:  http://localhost:3000/api/health"
log "  - Ready:   http://localhost:3000/api/ready"
log "  - Metrics: http://localhost:3000/api/metrics"
log ""
log "Next steps:"
log "  1. Set up SSL: ./scripts/deploy/setup-ssl.sh"
log "  2. Set up backup: ./scripts/deploy/backup.sh"
log "  3. Set up monitoring: see PRODUCTION.md"
