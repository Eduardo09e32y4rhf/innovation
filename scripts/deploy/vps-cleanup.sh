#!/usr/bin/env bash
# Limpeza segura da VPS: remove versões antigas de imagens, contêineres parados e cache de build.
# NUNCA remove volumes (dados do Postgres, Redis, anexos e backups) nem o contêiner em uso.
# Uso:  bash scripts/deploy/vps-cleanup.sh            (só mostra o que seria removido)
#       bash scripts/deploy/vps-cleanup.sh --apply    (remove de verdade)
set -Eeuo pipefail

APPLY="${1:-}"
COMPOSE="docker compose -f docker-compose.prod.yml"
cd "$(dirname "$0")/../.."

run() {
  if [ "$APPLY" = "--apply" ]; then "$@"; else echo "  [simulação] $*"; fi
}

echo "== Contêineres em uso (não serão tocados)"
$COMPOSE ps --format 'table {{.Service}}\t{{.Image}}\t{{.Status}}' || true

echo
echo "== Contêineres parados"
docker ps -a --filter status=exited --filter status=created --format '  {{.ID}}  {{.Names}}  ({{.Status}})' || true
run docker container prune -f

echo
echo "== Imagens sem tag (restos de builds antigos)"
docker images -f dangling=true --format '  {{.ID}}  {{.Repository}}  {{.CreatedSince}}  {{.Size}}' || true
run docker image prune -f

echo
echo "== Imagens do projeto que não estão em uso"
IN_USE="$($COMPOSE images -q 2>/dev/null | sort -u || true)"
docker images --format '{{.ID}} {{.Repository}}:{{.Tag}}' | grep -E 'innovation|apps-api|apps-web|api:|web:' | while read -r id name; do
  if ! grep -q "$id" <<<"$IN_USE"; then
    echo "  $id  $name"
    run docker rmi "$id"
  fi
done || true

echo
echo "== Cache de build com mais de 7 dias"
docker buildx du 2>/dev/null | tail -1 || true
run docker builder prune -f --filter until=168h

echo
echo "== Cópias antigas do repositório (decisão manual: NÃO são apagadas pelo script)"
for dir in /var/www/innovation /opt/app /root/innovation /home/*/innovation; do
  [ -d "$dir/.git" ] && echo "  $dir  ($(git -C "$dir" rev-parse --short HEAD 2>/dev/null || echo '?'))"
done || true
echo "  Mantenha só o diretório onde o docker-compose.prod.yml está rodando."

echo
echo "== Volumes (preservados; só listados)"
docker volume ls --format '  {{.Name}}' || true

if [ "$APPLY" != "--apply" ]; then
  echo
  echo "Nada foi removido. Para aplicar: bash scripts/deploy/vps-cleanup.sh --apply"
fi
