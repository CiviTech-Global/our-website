#!/usr/bin/env sh
#
# backup-loop.sh — run backup-postgres.sh on a fixed interval, forever.
#
# Intended to run as the entrypoint of the docker-compose `backup` service
# (see docker-compose.yml), where DATABASE_URL points at the `postgres`
# service on the compose network and BACKUP_DIR is a mounted volume so
# dumps survive container restarts/recreation.
#
# BACKUP_INTERVAL_SECONDS defaults to 86400 (daily). BACKUP_RETENTION_DAYS
# defaults to 14 — dumps older than that are pruned after each run so the
# backup volume doesn't grow unbounded.

set -eu

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

echo "backup-loop: starting. interval=${INTERVAL}s retention=${RETENTION_DAYS}d dir=${BACKUP_DIR}"

while true; do
  if ./scripts/backup-postgres.sh; then
    find "$BACKUP_DIR" -name 'civitechglobal_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete || true
  else
    echo "backup-loop: backup attempt failed, will retry after the next interval" >&2
  fi
  sleep "$INTERVAL"
done
