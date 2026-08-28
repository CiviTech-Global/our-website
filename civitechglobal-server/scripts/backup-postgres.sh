#!/usr/bin/env bash
#
# backup-postgres.sh — dump the CivitechGlobal Postgres database to a
# timestamped, gzip-compressed .sql file.
#
# USAGE
#   DATABASE_URL='postgresql://user:pass@host:5432/dbname' ./scripts/backup-postgres.sh
#
#   Reads the connection string from the DATABASE_URL environment variable
#   (the same variable the server/bot processes use — see .env.example).
#   If unset, this script will try to load it from a `.env` file in the
#   current working directory.
#
#   Output directory defaults to ./backups (relative to wherever the script
#   is invoked from) and can be overridden with BACKUP_DIR:
#
#     BACKUP_DIR=/var/backups/civitechglobal ./scripts/backup-postgres.sh
#
#   Output filename: civitechglobal_<UTC timestamp>.sql.gz
#
# DOCKER COMPOSE USAGE
#   When Postgres is only reachable through the docker-compose network (e.g.
#   the host port isn't published, or you're running this from inside
#   another container), pipe the dump through `docker exec` against the
#   compose `postgres` service instead of connecting directly. Adjust the
#   container name below to match `docker compose ps` on your host — the
#   default compose project name is usually the parent directory name, e.g.
#   `our-website-postgres-1` or `civitechglobal-server-postgres-1`:
#
#     docker exec -t <postgres-container-name> \
#       pg_dump -U "${POSTGRES_USER:-civitech}" "${POSTGRES_DB:-civitechglobal}" \
#       | gzip > "./backups/civitechglobal_$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
#
# RESTORE
#   Restoring a backup produced by this script (direct connection):
#
#     gunzip -c backups/civitechglobal_<timestamp>.sql.gz | psql "$DATABASE_URL"
#
#   Restoring into the docker-compose postgres service instead:
#
#     gunzip -c backups/civitechglobal_<timestamp>.sql.gz | \
#       docker exec -i <postgres-container-name> psql -U "${POSTGRES_USER:-civitech}" "${POSTGRES_DB:-civitechglobal}"
#
# REQUIREMENTS
#   `pg_dump` (matching or newer than the target Postgres major version) and
#   `gzip` must be on PATH. On the docker-compose host you can instead rely
#   entirely on `docker exec` as shown above, without pg_dump installed
#   locally.

set -euo pipefail

# Fall back to a local .env file if DATABASE_URL isn't already exported.
if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set (and no .env file provided one)." >&2
  echo "Usage: DATABASE_URL='postgresql://user:pass@host:5432/dbname' $0" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output_file="${BACKUP_DIR%/}/civitechglobal_${timestamp}.sql.gz"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump is not on PATH. Either install the postgresql-client" >&2
  echo "package, or use the docker-compose 'docker exec' approach documented" >&2
  echo "in this script's header comment." >&2
  exit 1
fi

echo "Backing up database to ${output_file} ..."
pg_dump "$DATABASE_URL" | gzip > "$output_file"

echo "Backup complete: ${output_file} ($(du -h "$output_file" | cut -f1))"
