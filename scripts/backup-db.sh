#!/usr/bin/env bash
# HackBridge Automated Database Backup & Disaster Recovery Script
# Supports local SQLite or production PostgreSQL

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "=== [HackBridge Backup] Starting Database Backup at $(date) ==="

if [[ -f "prisma/dev.db" ]]; then
  TARGET_FILE="$BACKUP_DIR/hackbridge_sqlite_${TIMESTAMP}.db.gz"
  echo "Backing up local SQLite database: prisma/dev.db -> $TARGET_FILE"
  # Use sqlite3 .backup or safe copy with gzip
  gzip -c "prisma/dev.db" > "$TARGET_FILE"
  echo "✓ SQLite snapshot created successfully: $(du -h "$TARGET_FILE" | cut -f1)"
elif [[ "${DATABASE_URL:-}" =~ ^postgres ]]; then
  TARGET_FILE="$BACKUP_DIR/hackbridge_pg_${TIMESTAMP}.sql.gz"
  echo "Backing up PostgreSQL database from DATABASE_URL -> $TARGET_FILE"
  pg_dump "$DATABASE_URL" | gzip > "$TARGET_FILE"
  echo "✓ PostgreSQL dump created successfully: $(du -h "$TARGET_FILE" | cut -f1)"
else
  echo "⚠ No recognized database file or PostgreSQL connection string found. Exiting."
  exit 1
fi

# Prune snapshots older than RETENTION_DAYS
echo "Pruning snapshots older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "hackbridge_*.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} +
echo "✓ Snapshot pruning complete."

echo "=== [HackBridge Backup] Completed at $(date) ==="
