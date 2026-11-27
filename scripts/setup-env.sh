#!/bin/bash
# ============================================================
# FINEX Forex Trading Platform — Interactive Env Setup
# ============================================================
# Usage:
#   bash scripts/setup-env.sh           # development (.env)
#   bash scripts/setup-env.sh prod      # production (.env.production)
#
# Script ini akan:
# 1. Copy template .env.example atau .env.production.example
# 2. Tanya nilai API keys secara interaktif
# 3. Generate NEXTAUTH_SECRET + API_KEY_ENCRYPTION_KEY otomatis
# 4. Validasi minimal config
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE="${1:-dev}"

if [ "$MODE" = "prod" ]; then
  TEMPLATE=".env.production.example"
  TARGET=".env.production"
  ENV_NAME="production"
else
  TEMPLATE=".env.example"
  TARGET=".env"
  ENV_NAME="development"
fi

log()  { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARN:${NC} $1"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"; }
info() { echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO:${NC} $1"; }

log "FINEX Forex Trading Platform — Setup Env ($ENV_NAME)"

# 1. Cek template ada
if [ ! -f "$TEMPLATE" ]; then
  err "Template $TEMPLATE tidak ditemukan."
  err "Pastikan Anda berada di root directory project."
  exit 1
fi

# 2. Jika target sudah ada, konfirmasi overwrite
if [ -f "$TARGET" ]; then
  warn "File $TARGET sudah ada. Overwrite? (y/N)"
  read -r CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    log "Dibatalkan. File $TARGET tidak diubah."
    exit 0
  fi
fi

# 3. Copy template
cp "$TEMPLATE" "$TARGET"
log "Template copied: $TEMPLATE -> $TARGET"

# 4. Helper untuk update var
update_var() {
  local key="$1"
  local prompt="$2"
  local default="$3"
  local is_secret="${4:-false}"

  echo ""
  info "$prompt"
  if [ -n "$default" ]; then
    echo -n "  [default: $default] "
  fi
  if [ "$is_secret" = "true" ]; then
    read -r -s VALUE
    echo ""
  else
    read -r VALUE
  fi
  VALUE="${VALUE:-$default}"

  if [ -n "$VALUE" ]; then
    if grep -q "^$key=" "$TARGET"; then
      sed -i "s|^$key=.*|$key=$VALUE|" "$TARGET"
    else
      echo "$key=$VALUE" >> "$TARGET"
    fi
    log "  ✓ $key set"
  fi
}

# 5. Generate secrets otomatis
generate_secret() {
  local key="$1"
  local length="${2:-32}"
  local cur_val
  cur_val=$(grep "^$key=" "$TARGET" | cut -d= -f2- | sed 's/[[:space:]]*#.*//' | tr -d '[:space:]')
  if [ -z "$cur_val" ] || [ "${#cur_val}" -lt 16 ]; then
    warn "$key missing atau terlalu pendek. Generate otomatis?"
    echo -n "  [Y/n] "
    read -r gen_confirm
    if [ "$gen_confirm" != "n" ] && [ "$gen_confirm" != "N" ]; then
      local secret
      secret=$(openssl rand -hex "$length" 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w $((length * 2)) | head -n 1)
      if grep -q "^$key=" "$TARGET"; then
        sed -i "s|^$key=.*|$key=$secret|" "$TARGET"
      else
        echo "$key=$secret" >> "$TARGET"
      fi
      log "  ✓ $key generated (length: ${#secret})"
    else
      info "  - $key skipped (akan pakai default atau edit manual)"
    fi
  else
    log "  ✓ $key sudah set (skip auto-generate)"
  fi
}

# 6. Tanya konfigurasi utama
echo ""
info "=== Konfigurasi MT5 / FINEX Indonesia ==="
update_var "MT5_LOGIN" "MT5 Login (nomor akun):" "" false
update_var "MT5_PASSWORD" "MT5 Password:" "" true
update_var "MT5_SERVER" "MT5 Server (default: FINEX-Live):" "FINEX-Live" false

echo ""
info "=== Konfigurasi AI Provider ==="
update_var "AI_PROVIDER" "AI Provider (groq/local, default: groq):" "groq" false
update_var "GROQ_API_KEY" "Groq API Key (gsk_xxx, kosongkan jika pakai local):" "" true

echo ""
info "=== Konfigurasi Tiingo News API ==="
update_var "TIINGO_API_KEY" "Tiingo API Key:" "" true

# 7. Generate security secrets
echo ""
info "=== Generate Security Secrets ==="
generate_secret "NEXTAUTH_SECRET" 32
generate_secret "API_KEY_ENCRYPTION_KEY" 32

# 8. Untuk production, tanya APP_URL
if [ "$MODE" = "prod" ]; then
  echo ""
  info "=== Production URL ==="
  update_var "NEXT_PUBLIC_APP_URL" "App URL (https://your-domain.com):" "" false
  update_var "CORS_ORIGINS" "CORS Origins (comma-separated):" "" false
fi

# 9. Validasi minimal
echo ""
info "=== Validasi ==="
ERRORS=0
if [ "$MODE" = "prod" ]; then
  if ! grep -q "^NEXTAUTH_SECRET=.\{16,\}" "$TARGET"; then
    err "NEXTAUTH_SECRET belum di-set atau terlalu pendek (min 16 chars)"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "^NEXT_PUBLIC_APP_URL=" "$TARGET"; then
    err "NEXT_PUBLIC_APP_URL belum di-set (wajib production)"
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ $ERRORS -gt 0 ]; then
  err "$ERRORS error ditemukan. Edit $TARGET manual untuk fix."
  err "  nano $TARGET  atau  code $TARGET"
  exit 1
fi

# 10. Show summary
echo ""
log "Setup selesai! File: $TARGET"
echo ""
info "Ringkasan:"

# Helper untuk cek apakah var ter-set (non-empty)
check_set() {
  local key="$1"
  local val
  val=$(grep "^$key=" "$TARGET" | cut -d= -f2- | sed 's/[[:space:]]*#.*//' | tr -d '[:space:]')
  if [ -n "$val" ]; then
    info "  - $key: ✓ set"
  else
    info "  - $key: ✗ empty"
  fi
}

# MT5 (mask sensitive)
MT5_LOGIN_VAL=$(grep "^MT5_LOGIN=" "$TARGET" | cut -d= -f2- | sed 's/[[:space:]]*#.*//' | tr -d '[:space:]')
if [ -n "$MT5_LOGIN_VAL" ]; then
  info "  - MT5_LOGIN: ${MT5_LOGIN_VAL:0:4}****"
else
  info "  - MT5_LOGIN: ✗ empty (wajib untuk trading real)"
fi
MT5_SERVER_VAL=$(grep "^MT5_SERVER=" "$TARGET" | cut -d= -f2- | sed 's/[[:space:]]*#.*//' | tr -d '[:space:]')
info "  - MT5_SERVER: ${MT5_SERVER_VAL:-empty}"
check_set "AI_PROVIDER"
check_set "GROQ_API_KEY"
check_set "TIINGO_API_KEY"
check_set "NEXTAUTH_SECRET"

echo ""
log "Langkah selanjutnya:"
if [ "$MODE" = "prod" ]; then
  log "  1. Test config: cat .env.production | grep -v '^#' | grep -v '^$'"
  log "  2. Deploy: ./scripts/deploy/deploy.sh docker"
  log "  3. Setup SSL: ./scripts/deploy/setup-ssl.sh forex.your-domain.com"
else
  log "  1. Install dependencies: bun install"
  log "  2. Setup database: bun run db:push"
  log "  3. Start bridge: cd mini-services/mt5-bridge && bun run dev"
  log "  4. Start Next.js: bun run dev"
  log "  5. Buka: http://localhost:3000"
fi
echo ""
log "Atau edit manual: nano $TARGET"
