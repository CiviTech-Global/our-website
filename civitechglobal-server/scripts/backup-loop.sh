#!/usr/bin/env sh
#
# backup-loop.sh — run backup-postgres.sh on a fixed interval, forever, and
# push each dump off the host.
#
# Intended to run as the entrypoint of the docker-compose `backup` service
# (see docker-compose.yml), where DATABASE_URL points at the `postgres`
# service on the compose network and BACKUP_DIR is a mounted volume so
# dumps survive container restarts/recreation.
#
# BACKUP_INTERVAL_SECONDS defaults to 86400 (daily). BACKUP_RETENTION_DAYS
# defaults to 14 — dumps older than that are pruned after each run so the
# backup volume doesn't grow unbounded.
#
# OFF-HOST COPIES
#   BACKUP_REMOTE is an rclone destination, e.g. "civitech-backups:civitech"
#   or "s3-prod:civitech/postgres". When it is set, every new dump is copied
#   there immediately after it is written. When it is NOT set, the local
#   dumps live on the same host — and usually the same disk — as the database
#   they protect, so a host loss, a disk loss or a stray `docker volume
#   prune` destroys the database and every one of its backups together. That
#   is not a backup strategy, so this script says so loudly on every cycle
#   rather than letting it pass quietly.
#
#   Configure the remote by mounting an rclone config into the container:
#     volumes:
#       - ./rclone.conf:/config/rclone/rclone.conf:ro
#   and set BACKUP_REMOTE. Verify from the host with:
#     docker compose exec backup rclone lsd "$BACKUP_REMOTE"

set -eu

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"

echo "backup-loop: starting. interval=${INTERVAL}s retention=${RETENTION_DAYS}d dir=${BACKUP_DIR}"

if [ -n "$BACKUP_REMOTE" ]; then
  echo "backup-loop: off-host copies enabled -> ${BACKUP_REMOTE}"
else
  echo "backup-loop: WARNING BACKUP_REMOTE is unset. Dumps stay on this host only." >&2
fi

# Copies everything newer than the retention window, so a remote that was
# unreachable during an earlier cycle catches up on the next one instead of
# leaving a permanent hole.
sync_offsite() {
  [ -n "$BACKUP_REMOTE" ] || return 0

  if rclone copy "$BACKUP_DIR" "$BACKUP_REMOTE" \
       --include 'civitechglobal_*.sql.gz' \
       --max-age "${RETENTION_DAYS}d" \
       --transfers 2 --retries 3; then
    echo "backup-loop: off-host copy complete -> ${BACKUP_REMOTE}"
  else
    # Not fatal: the local dump already exists and the next cycle retries.
    # Loud, though — an off-host copy that has been silently failing for a
    # month is indistinguishable from never having configured one.
    echo "backup-loop: ERROR off-host copy to ${BACKUP_REMOTE} FAILED. The only copy of this dump is on the host it protects." >&2
  fi
}

while true; do
  if ./scripts/backup-postgres.sh; then
    sync_offsite
    find "$BACKUP_DIR" -name 'civitechglobal_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete || true
  else
    echo "backup-loop: backup attempt failed, will retry after the next interval" >&2
  fi

  if [ -z "$BACKUP_REMOTE" ]; then
    echo "backup-loop: WARNING these dumps exist ONLY on this host. Set BACKUP_REMOTE, or accept losing them with the machine." >&2
  fi

  sleep "$INTERVAL"
done
