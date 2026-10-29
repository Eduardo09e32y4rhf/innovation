#!/usr/bin/env bash
# Atualiza somente API/web; banco e volumes nunca são recriados ou revertidos.
# Uso: bash scripts/deploy/vps-update.sh [SHA|main] [--prebuilt]
#   --prebuilt  usa o pacote .deploy/images.tar.gz enviado pelo CI (workflow Deploy). Nunca compila na VPS.
#   (sem flag)  baixa a imagem pronta do GHCR (workflow "Imagens Docker"), esperando a publicação; se não
#               houver a do SHA usa a última da main; só como último recurso compila na VPS (lento).
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
TARGET="${1:-main}"
MODE="${2:-}"
compose() { docker compose -f docker-compose.prod.yml "$@"; }
mkdir -p .deploy
exec 9>.deploy/deploy.lock
flock -n 9 || { echo 'Outro deploy está em andamento. Acompanhe: tail -f storage/deploy-*.log'; exit 1; }

[ -f .env ] || { echo 'Falta .env de produção.'; exit 1; }
git fetch origin main
if [[ "$TARGET" =~ ^[0-9a-f]{40}$ ]]; then
  git merge-base --is-ancestor "$TARGET" origin/main || { echo 'SHA não pertence à main.'; exit 1; }
else
  [ "$TARGET" = main ] || { echo 'Use main ou um SHA completo da main.'; exit 1; }
  TARGET="$(git rev-parse origin/main)"
fi
# A VPS é só destino de deploy: alterações locais em arquivos versionados são guardadas, não bloqueiam o deploy.
if ! git diff --quiet || ! git diff --cached --quiet; then
  STAMP="$(date +%Y%m%d-%H%M%S)"
  echo "AVISO: alterações locais em arquivos versionados. Guardando no stash (vps-$STAMP)."
  git stash push -m "vps-$STAMP" >/dev/null
fi
git checkout --detach "$TARGET"
bash scripts/security/bootstrap-env.sh >/dev/null

if [ "$MODE" = --prebuilt ]; then
  export API_IMAGE="innovation-api:$TARGET"
  export WEB_IMAGE="innovation-web:$TARGET"
  compose config --quiet
  [ -s .deploy/images.tar.gz ] || { echo 'Pacote de imagens ausente.'; exit 1; }
  (cd .deploy && sha256sum -c images.tar.gz.sha256)
  gzip -dc .deploy/images.tar.gz | docker load
  docker image inspect "$API_IMAGE" "$WEB_IMAGE" >/dev/null
else
  # Imagens prontas do GitHub (workflow "Imagens Docker"): sem build na VPS.
  OWNER_IMG="${GHCR_IMAGE_PREFIX:-ghcr.io/eduardo09e32y4rhf}"
  use_tag() { export API_IMAGE="$OWNER_IMG/innovation-api:$1" WEB_IMAGE="$OWNER_IMG/innovation-web:$1"; }
  use_tag "$TARGET"
  compose config --quiet
  PULLED=0
  for i in $(seq 1 40); do
    if compose pull -q api web 2>/dev/null; then PULLED=1; break; fi
    echo "  imagem $TARGET ainda não publicada no GitHub ($i/40), aguardando 15s..."
    sleep 15
  done
  if [ "$PULLED" = 0 ]; then
    # Usa a última imagem publicada da main em vez de construir na VPS.
    use_tag main
    if compose pull -q api web 2>/dev/null; then PULLED=1; echo "  usando imagem da main (a do SHA não foi publicada)"; fi
  fi
  if [ "$PULLED" = 0 ]; then
    echo "AVISO: não baixou do GHCR; build local (lento, pode faltar memória)."
    use_tag "$TARGET"
    # Garante 4G de swap para o build não derrubar a VPS por falta de memória.
    if [ "$(swapon --show --noheadings | wc -l)" = 0 ] && [ ! -f /swapfile ]; then
      fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile \
        && echo '/swapfile none swap sw 0 0' >> /etc/fstab || echo "  sem permissão para criar swap"
    fi
    export NODE_OPTIONS="--max-old-space-size=1536"
    # Um serviço por vez e com prioridade baixa: construir API e web juntos dobra o pico de memória.
    COMPOSE_PARALLEL_LIMIT=1 nice -n 10 docker compose -f docker-compose.prod.yml build api
    COMPOSE_PARALLEL_LIMIT=1 nice -n 10 docker compose -f docker-compose.prod.yml build web
    unset NODE_OPTIONS
  fi
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
  echo 'FALHA: nova versão não ficou saudável. Restaurando as imagens anteriores; banco e volumes preservados.'
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
