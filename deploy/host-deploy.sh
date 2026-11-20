#!/usr/bin/env bash
set -euo pipefail

cd /opt/codequest/deploy
test -s .env
docker compose up -d --build
curl --fail --silent --show-error --retry 10 --retry-delay 3 --retry-connrefused \
  http://127.0.0.1:18080/api/health | grep -Fq '"database":"conectada"'
