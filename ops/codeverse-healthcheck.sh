#!/usr/bin/env bash
set -Eeuo pipefail

APP_URL="${APP_URL:-https://interviewlattice.duckdns.org}"

curl --fail --silent --show-error --max-time 15 "$APP_URL/api/health" \
  | grep -q '"success":true'
systemctl is-active --quiet codeverse-backend
systemctl is-active --quiet nginx
systemctl is-active --quiet docker

logger -t codeverse-healthcheck "health check passed"
