#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/codeverse/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ -z "${MONGO_URI:-}" ]]; then
  echo "MONGO_URI is required" >&2
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "mongodump is not installed" >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$BACKUP_DIR/codeverse-$stamp.archive.gz"

mongodump --uri="$MONGO_URI" --archive="$archive" --gzip
test -s "$archive"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'codeverse-*.archive.gz' -mtime "+$RETENTION_DAYS" -delete
echo "MongoDB backup created: $archive"
