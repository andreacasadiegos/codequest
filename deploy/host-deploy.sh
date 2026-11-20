#!/usr/bin/env bash
set -euo pipefail

cd /opt/codequest/deploy
test -s .env

# Apply the additive CodeBot history migration on every deploy. The SQL is
# idempotent, so existing conversations and accounts are preserved.
docker compose up -d db
db_ready=false
for attempt in {1..30}; do
  if docker compose exec -T db pg_isready -U codequest -d codequest >/dev/null 2>&1; then
    db_ready=true
    break
  fi
  sleep 2
done
if [[ "$db_ready" != true ]]; then
  docker compose logs --tail=40 db >&2 || true
  printf '%s\n' 'La base de datos de CodeQuest no inició a tiempo.' >&2
  exit 1
fi
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < ../database/supabase/migracion_codebot.sql

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
