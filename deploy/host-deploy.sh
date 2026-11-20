#!/usr/bin/env bash
set -euo pipefail

cd /opt/codequest/deploy
test -s .env
docker compose up -d --build

for attempt in {1..30}; do
  if response=$(curl --fail --silent --max-time 10 http://127.0.0.1:18080/api/health 2>/dev/null) \
    && grep -Fq '"database":"conectada"' <<<"$response"; then
    exit 0
  fi
  sleep 2
done

printf '%s\n' 'CodeQuest no pasó la comprobación de salud después de 60 segundos.' >&2
docker compose logs --tail=40 api web db >&2 || true
exit 1
