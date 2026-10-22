#!/usr/bin/env bash
# Atualiza somente API/web; banco e volumes nunca são recriados ou revertidos.
# Uso: bash scripts/deploy/vps-update.sh [SHA|branch] [--prebuilt]
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
TARGET="${1:-main}"
MODE="${2:-}"
compose() { docker compose -f docker-compose.prod.yml "$@"; }
mkdir -p .deploy
exec 9>.deploy/deploy.lock
flock -n 9 || { echo 'Outro deploy está em andamento.'; exit 1; }

[ -f .env ] || { echo 'Falta .env de produção.'; exit 1; }
git fetch origin main
if [[ "$TARGET" =~ ^[0-9a-f]{40}$ ]]; then
  git merge-base --is-ancestor "$TARGET" origin/main || { echo 'SHA não pertence à main.'; exit 1; }
else
  [ "$TARGET" = main ] || { echo 'Use main ou um SHA completo da main.'; exit 1; }
  TARGET="$(git rev-parse origin/main)"
fi
git checkout --detach "$TARGET"
bash scripts/security/bootstrap-env.sh >/dev/null

export API_IMAGE="innovation-api:$TARGET"
export WEB_IMAGE="innovation-web:$TARGET"
compose config --quiet
if [ "$MODE" = --prebuilt ]; then
  [ -s .deploy/images.tar.gz ] || { echo 'Pacote de imagens ausente.'; exit 1; }
  (cd .deploy && sha256sum -c images.tar.gz.sha256)
  gzip -dc .deploy/images.tar.gz | docker load
  docker image inspect "$API_IMAGE" "$WEB_IMAGE" >/dev/null
else
  # Fallback manual: sequência para não compilar API e Next simultaneamente.
  COMPOSE_PARALLEL_LIMIT=1 compose build api web
fi

# Falha antes de mexer no banco ou trocar o serviço se a configuração é inválida.
compose run --rm --no-deps --entrypoint node api -e \
  'require("./apps/api/dist/config/env.validation").validateEnv(process.env); console.log("Configuração de produção válida");'

old_api_id="$(compose ps -q api)"
old_web_id="$(compose ps -q web)"
old_api=""; old_web=""
if [ -n "$old_api_id" ]; then old_api="$(docker inspect --format '{{.Image}}' "$old_api_id")"; fi
if [ -n "$old_web_id" ]; then old_web="$(docker inspect --format '{{.Image}}' "$old_web_id")"; fi

bash scripts/backup/backup.sh
bash scripts/deploy/apply-migrations.sh

health() {
  local service="$1" port="$2" route="$3"
  for ((i=0; i<30; i++)); do
    if compose exec -T "$service" wget -T 3 -qO- "http://127.0.0.1:$port/$route" >/dev/null 2>&1; then return 0; fi
    sleep 4
  done
  return 1
}
rollback() {
  local code="$?"
  trap - ERR
  echo 'Nova versão falhou. Restaurando as imagens anteriores; banco e volumes preservados.'
  compose logs --tail=80 api web || true
  if [ -n "$old_api" ] && [ -n "$old_web" ]; then
    API_IMAGE="$old_api" WEB_IMAGE="$old_web" compose up -d --no-build --no-deps api web || true
  else
    echo 'Sem duas imagens anteriores disponíveis para restauração automática.'
  fi
  exit "$code"
}
trap rollback ERR
compose up -d --no-build --no-deps api
health api 3333 health/ready
compose up -d --no-build --no-deps web
health web 3000 ''
trap - ERR
printf '%s\n' "$TARGET" > .deploy/current-sha
echo "Deploy saudável: $TARGET"
compose ps
