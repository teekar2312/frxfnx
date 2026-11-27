#!/bin/sh
# Docker entrypoint: jalankan Next.js + MT5 bridge bersamaan
# Untuk MT5 bridge, gunakan Node (lebih stabil dari Bun di container)

set -e

echo "[$(date)] Starting FINEX Forex Trading Platform..."

# 1. Run database migrations
echo "[$(date)] Running database migrations..."
npx prisma db push --accept-data-loss 2>&1 || echo "[WARN] Prisma db push failed (might be ok if no schema changes)"

# 2. Start MT5 bridge di background (Node.js)
echo "[$(date)] Starting MT5 Bridge on port $BRIDGE_PORT..."
cd /app/mini-services/mt5-bridge
node --experimental-strip-types index.js &
BRIDGE_PID=$!
echo "[$(date)] Bridge PID: $BRIDGE_PID"

# 3. Trap signals untuk graceful shutdown
trap "echo '[$(date)] Shutting down...'; kill $BRIDGE_PID 2>/dev/null; exit 0" SIGTERM SIGINT

# 4. Start Next.js production server
echo "[$(date)] Starting Next.js on port $PORT..."
cd /app
exec node server.js
