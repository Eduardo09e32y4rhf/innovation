#!/usr/bin/env bash
# Atualização segura da VPS: código → backup → migrations → build/subida → verificação de saúde (com rollback orientado).
# Uso: bash scripts/deploy/vps-update.sh [branch]   (padrão: main)
set -Eeuo pipefail

cd "$(dirname "$0")/../.."
BRANCH="${1:-main}"
COMPOSE="docker compose -f docker-compose.prod.yml"
PREV="$(git rev-parse --short HEAD)"

# Evita dois deploys ao mesmo tempo (ex.: reexecutar enquanto o anterior ainda roda em segundo plano).
if command -v flock >/dev/null 2>&1; then
  exec 9>/tmp/innovation-deploy.lock
  flock -n 9 || { echo "Já existe um deploy em andamento. Acompanhe: tail -f storage/deploy-*.log"; exit 1; }
fi

echo "== 1/6 Código ($PREV → origin/$BRANCH)"
git fetch --tags origin "$BRANCH"
if [ -n "${2:-}" ] || [[ "$BRANCH" =~ ^[0-9a-f]{7,40}$ || "$BRANCH" =~ ^v[0-9] ]]; then
  git checkout --detach "$BRANCH"   # SHA ou tag (usado pelo GitHub Actions)
else
  # A VPS é só destino de deploy: deve espelhar o GitHub. Se ela tiver commits ou alterações que não estão
  # no GitHub (o que quebra o fast-forward), guarda uma cópia e espelha a branch, em vez de abortar o deploy.
  if ! git merge-base --is-ancestor HEAD "origin/$BRANCH" 2>/dev/null; then
    STAMP="$(date +%Y%m%d-%H%M%S)"
    echo "AVISO: a VPS tem commits que não estão no GitHub. Guardando em vps-backup-$STAMP e espelhando origin/$BRANCH."
    git branch "vps-backup-$STAMP" HEAD
  fi
  if ! git diff --quiet || ! git diff --cached --quiet; then
    STAMP="${STAMP:-$(date +%Y%m%d-%H%M%S)}"
    echo "AVISO: alterações locais em arquivos versionados. Guardando no stash (vps-$STAMP)."
    git stash push -m "vps-$STAMP" >/dev/null
  fi
  git checkout -B "$BRANCH" "origin/$BRANCH"
fi
NEW="$(git rev-parse --short HEAD)"

echo "== 2/6 Segredos (.env)"
[ -f .env ] || { echo "Falta .env. Rode: bash scripts/security/bootstrap-env.sh https://seu-dominio"; exit 1; }
bash scripts/security/bootstrap-env.sh >/dev/null   # só completa o que estiver faltando

echo "== 3/6 Backup antes de mexer no banco"
bash scripts/backup/backup.sh

echo "== 4/6 Migrations pendentes"
bash scripts/deploy/apply-migrations.sh

echo "== 5/6 Build e subida"
# Um serviço por vez e com prioridade baixa: construir API e web juntos dobra o pico de memória e derruba VPS pequena.
# Imagens prontas do GitHub (workflow "Imagens Docker"): sem build na VPS.
export IMAGE_TAG="$(git rev-parse HEAD)"
PULLED=0
for i in $(seq 1 40); do
  if $COMPOSE pull -q api web 2>/dev/null; then PULLED=1; break; fi
  echo "  imagem $IMAGE_TAG ainda não publicada no GitHub ($i/40), aguardando 15s..."
  sleep 15
done
if [ "$PULLED" = 0 ]; then
  # Usa a última imagem publicada do branch em vez de construir na VPS.
  export IMAGE_TAG="${BRANCH//\//-}"
  $COMPOSE pull -q api web 2>/dev/null && PULLED=1 && echo "  usando imagem do branch: $IMAGE_TAG"
fi
if [ "$PULLED" = 1 ]; then
  $COMPOSE up -d --no-build --remove-orphans
else
  echo "AVISO: não baixou do GHCR; build local (lento, pode faltar memória)."
  # Garante 4G de swap para o build não derrubar a VPS por falta de memória.
  if [ "$(swapon --show --noheadings | wc -l)" = 0 ] && [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile \
      && echo '/swapfile none swap sw 0 0' >> /etc/fstab || echo "  sem permissão para criar swap"
  fi
  export NODE_OPTIONS="--max-old-space-size=1536"
  nice -n 10 $COMPOSE build api
  nice -n 10 $COMPOSE build web
  $COMPOSE up -d --remove-orphans
fi

echo "== 6/6 Verificação de saúde"
for i in $(seq 1 30); do
  if $COMPOSE exec -T api wget -qO- http://127.0.0.1:3333/health >/dev/null 2>&1; then
    echo "API saudável. Deploy $PREV → $NEW concluído."
    $COMPOSE ps
    exit 0
  fi
  sleep 4
done

echo "FALHA: a API não ficou saudável em 2 minutos."
$COMPOSE logs --tail=60 api || true
echo
echo "Rollback do código:   git reset --hard $PREV && $COMPOSE up -d --build"
echo "Rollback do banco:    gunzip -c storage/backups/<ultimo>.sql.gz | $COMPOSE exec -T db psql -U \${POSTGRES_USER:-innovation} -d \${POSTGRES_DB:-innovation_db}"
exit 1
