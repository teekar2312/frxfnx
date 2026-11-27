#!/bin/bash
# Backup script: database + logs + config
# Usage: ./scripts/deploy/backup.sh
# Cron: 0 2 * * * /opt/finex-forex/scripts/deploy/backup.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$DATE"
mkdir -p "$BACKUP_PATH"

echo "[$(date)] Starting backup to $BACKUP_PATH"

# 1. Database (SQLite)
if [ -f "db/custom.db" ]; then
  echo "Backing up database..."
  # Use sqlite3 .backup untuk consistent snapshot
  if command -v sqlite3 >/dev/null; then
    sqlite3 db/custom.db ".backup '$BACKUP_PATH/database.db'"
  else
    cp db/custom.db "$BACKUP_PATH/database.db"
  fi
  echo "  ✓ Database ($BACKUP_PATH/database.db)"
fi

# 2. Logs
if [ -d "logs" ]; then
  echo "Backing up logs..."
  cp -r logs "$BACKUP_PATH/logs"
  echo "  ✓ Logs"
fi

# 3. Config (NO secrets)
echo "Backing up config..."
cp package.json "$BACKUP_PATH/"
cp -r prisma "$BACKUP_PATH/"
[ -f .env.production.example ] && cp .env.production.example "$BACKUP_PATH/"
echo "  ✓ Config"

# 4. Compress
echo "Compressing..."
tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"
rm -rf "$BACKUP_PATH"
echo "  ✓ $BACKUP_PATH.tar.gz"

# 5. Cleanup old backups (keep last 7)
echo "Cleaning old backups..."
ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm
echo "  ✓ Old backups removed"

# 6. Optional: upload to S3/cloud storage
if [ -n "$S3_BUCKET" ]; then
  echo "Uploading to S3..."
  aws s3 cp "$BACKUP_PATH.tar.gz" "s3://$S3_BUCKET/backups/" --storage-class STANDARD_IA
  echo "  ✓ Uploaded"
fi

echo "[$(date)] Backup complete: $BACKUP_PATH.tar.gz"
echo "Size: $(du -h "$BACKUP_PATH.tar.gz" | cut -f1)"
