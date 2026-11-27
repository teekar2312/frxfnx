# Production Deployment Guide — FINEX Forex Trading Platform v2.0

Panduan lengkap deploy aplikasi ke production dengan Docker, PM2, atau systemd.

## Prasyarat

- Server Linux (Ubuntu 22.04+ atau Debian 12+) dengan minimal 2GB RAM
- Domain + DNS A record ke IP server
- Ports 80, 443, 3000, 3004 open di firewall
- Untuk MT5 real: Windows 11 + MetaTrader 5 (FINEX Indonesia) — dijalankan terpisah

## Quick Start (Docker — recommended)

```bash
# 1. Clone
git clone https://github.com/teekar2312/frxfnx.git
cd frxfnx

# 2. Setup environment
cp .env.production.example .env.production
nano .env.production  # isi semua required vars

# 3. Generate secrets
openssl rand -hex 32  # NEXTAUTH_SECRET
openssl rand -hex 32  # API_KEY_ENCRYPTION_KEY

# 4. Deploy
./scripts/deploy/deploy.sh docker

# 5. Setup SSL
./scripts/deploy/setup-ssl.sh forex.your-domain.com

# 6. Cek status
docker compose ps
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

## Konfigurasi Environment (.env.production)

Required di production:

| Variable | Wajib | Deskripsi |
|---|---|---|
| `NODE_ENV=production` | ✅ | Set ke production |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL publik, e.g. `https://forex.your-domain.com` |
| `NEXTAUTH_SECRET` | ✅ | Min 16 chars random. Generate: `openssl rand -hex 32` |
| `GROQ_API_KEY` | ✅ (jika ai=groq) | Daftar di https://console.groq.com/keys |
| `LOCAL_AI_ENDPOINT` | ✅ (jika ai=local) | e.g. `http://127.0.0.1:11434/api/generate` |
| `API_KEY_ENCRYPTION_KEY` | Recommended | 32-byte hex untuk encrypt API keys at rest |
| `DATABASE_URL` | ✅ | SQLite (`file:./db/custom.db`) atau PostgreSQL |
| `CORS_ORIGINS` | ✅ | e.g. `https://forex.your-domain.com` |
| `LOG_LEVEL` | Recommended | `info` (default), `warn`, `error` |

## Deployment Targets

### 1. Docker (Recommended)

```bash
./scripts/deploy/deploy.sh docker
```

- Build image: `finex-forex:2.0.0`
- Run 2 services di container: Next.js (port 3000) + MT5 Bridge (port 3004)
- Auto-restart pada crash (`restart: unless-stopped`)
- Health check via `/api/health`
- Logs: `docker compose logs -f`

**Update:**
```bash
git pull
./scripts/deploy/deploy.sh docker  # rebuild + restart
```

### 2. PM2 (Node.js process manager)

```bash
./scripts/deploy/deploy.sh pm2
```

- 2 PM2 processes: `finex-forex` (Next.js) + `finex-bridge` (Socket.IO)
- Auto-restart, memory limits
- Logs ke `./logs/` dengan rotation
- Enable on boot: `pm2 startup`

**Commands:**
```bash
pm2 status
pm2 logs finex-forex
pm2 logs finex-bridge
pm2 restart finex-forex
pm2 stop all
```

### 3. Systemd (Linux native)

```bash
sudo ./scripts/deploy/deploy.sh systemd
```

- 2 systemd services: `finex-forex.service` + `finex-bridge.service`
- Security hardening: `NoNewPrivileges`, `ProtectSystem=strict`, `PrivateTmp`
- Resource limits: `MemoryMax=1G`, `CPUQuota=200%`
- Logs via journald: `journalctl -u finex-forex -f`

### 4. Nginx Reverse Proxy + SSL

```bash
./scripts/deploy/deploy.sh nginx
./scripts/deploy/setup-ssl.sh forex.your-domain.com
```

- HTTP → HTTPS redirect
- WebSocket upgrade untuk Socket.IO (`/socket.io/`)
- Rate limiting: 10 req/s untuk API, 50 req/s untuk static
- Long cache untuk Next.js static assets
- Let's Encrypt auto-renewal via cron

## Monitoring

### Health Check Endpoints

| Endpoint | Purpose | Status |
|---|---|---|
| `GET /api/health` | Liveness probe (app running?) | 200 if alive |
| `GET /api/ready` | Readiness probe (DB connected, AI configured?) | 200 if all checks pass |
| `GET /api/metrics` | Prometheus metrics (memory, CPU, uptime) | 200 |

### Logging

Logs ke `./logs/` dengan rotation (7 files x 50MB max):
- `app.log` — main application log (JSON format in production)
- `next-out.log` / `next-error.log` — Next.js stdout/stderr
- `bridge-out.log` / `bridge-error.log` — MT5 bridge logs

Sensitive fields (password, apiKey, secret, token, authorization) otomatis di-redact.

### Monitoring Setup (Optional)

**Sentry (error tracking):**
```bash
# .env.production
SENTRY_DSN=https://xxx@sentry.io/123
```

**Prometheus + Grafana:**
```bash
# /etc/prometheus/prometheus.yml
- job_name: 'finex-forex'
  static_configs:
    - targets: ['localhost:3000']
  metrics_path: /api/metrics
```

## Backup & Restore

### Backup (cron daily 02:00)

```bash
# Tambah ke crontab
0 2 * * * cd /opt/finex-forex && ./scripts/deploy/backup.sh

# Atau manual:
./scripts/deploy/backup.sh
```

Backup isi:
- `database.db` (SQLite snapshot)
- `logs/` (semua log files)
- `prisma/` (schema)
- `package.json`

Output: `./backups/backup_YYYYMMDD_HHMMSS.tar.gz` (auto-cleanup 7 backup terakhir)

### Restore

```bash
# Stop services
docker compose down  # atau pm2 stop all

# Extract backup
tar -xzf backups/backup_20241124_020000.tar.gz -C /tmp/restore

# Restore database
cp /tmp/restore/database.db db/custom.db

# Restart
docker compose up -d  # atau pm2 restart all
```

## Security Checklist

- ✅ HTTPS only (HSTS 1 year)
- ✅ CSP headers (production)
- ✅ Rate limiting (100 req/min per IP untuk API)
- ✅ Input validation (sanitization, length limits)
- ✅ API keys stored encrypted (jika API_KEY_ENCRYPTION_KEY set)
- ✅ No secrets in git (.env.production di .gitignore)
- ✅ Non-root user di Docker container
- ✅ systemd: ProtectSystem=strict, NoNewPrivileges
- ✅ Nginx: X-Frame-Options DENY, no cache untuk API

## Performance Tuning

### Next.js
- `output: 'standalone'` untuk Docker (self-contained)
- Static asset cache 1 year (immutable)
- Image optimization (AVIF, WebP)
- Compression (gzip level 6)

### Database
- SQLite untuk dev/small (<100k trades)
- PostgreSQL untuk production (>100k trades, concurrent users)
- Indexes pada: `Trade.accountId`, `Trade.symbol`, `Trade.openTime`, `NewsEvent.eventTime`

### Socket.IO
- WebSocket preferred (low latency)
- Polling fallback untuk restrictive networks
- Ping interval 25s, ping timeout 60s

## Troubleshooting

### App tidak bisa start
```bash
# Cek logs
docker compose logs app | tail -50
# Atau
pm2 logs finex-forex --lines 50

# Common issues:
# 1. NEXTAUTH_SECRET missing -> generate: openssl rand -hex 32
# 2. DATABASE_URL invalid -> check path
# 3. Port sudah dipakai -> lsof -i :3000
```

### MT5 Bridge tidak connect
```bash
# Cek bridge status
curl http://localhost:3004/socket.io/?EIO=4&transport=polling
# Harus return 200 dengan sid

# Cek logs
docker compose logs app | grep bridge
# Atau
pm2 logs finex-bridge
```

### Database locked (SQLite)
```bash
# Jika SQLite "database is locked"
# Solusi 1: Restart app
docker compose restart app
# Solusi 2: Migrate ke PostgreSQL (ganti DATABASE_URL)
```

### Memory leak / OOM
```bash
# Cek memory usage
docker stats
# Atau
pm2 monit

# Jika OOM, increase limits
# docker-compose.yml: memory: 2G
# ecosystem.config.cjs: max_memory_limit: '2G'
```

### Slow AI response
```bash
# Cek latency
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"groq","prompt":"test"}' | jq '.latencyMs'

# Groq normal: 200-500ms
# Local AI (Ollama): 1-10s tergantung model
```

## Upgrade Path

```bash
# 1. Backup dulu
./scripts/deploy/backup.sh

# 2. Pull latest
git fetch origin
git checkout main
git pull origin main

# 3. Run database migration jika ada schema changes
bun run db:push  # atau prisma migrate deploy

# 4. Redeploy
./scripts/deploy/deploy.sh docker  # atau pm2

# 5. Verify
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

## Rollback

```bash
# 1. Stop services
docker compose down

# 2. Restore backup
tar -xzf backups/backup_YYYYMMDD.tar.gz -C /tmp/restore
cp /tmp/restore/database.db db/custom.db

# 3. Checkout previous version
git checkout <previous-commit-hash>

# 4. Rebuild + restart
docker compose up -d --build
```

## Kontak & Support

- Repository: https://github.com/teekar2312/frxfnx
- Issues: https://github.com/teekar2312/frxfnx/issues
- Email: teekar2312@users.noreply.github.com

## Disclaimer

Aplikasi ini disediakan "AS IS" tanpa jaminan. Trading forex berisiko tinggi dan dapat menyebabkan kehilangan modal. Selalu uji di akun demo sebelum live trading. Pengguna bertanggung jawab penuh atas keputusan trading dan kerugian yang mungkin terjadi.

---

Dibuat untuk **FINEX Indonesia Forex Trading Platform v2.0**
