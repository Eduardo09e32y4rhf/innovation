#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERRO: $ENV_FILE não existe. Copie .env.prod.example e preencha os valores reais." >&2
  exit 1
fi

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

echo "Validando configuração do Docker Compose..."
"${compose[@]}" config --quiet

echo "Removendo somente containers e rede do projeto anterior (volumes serão preservados)..."
"${compose[@]}" down --remove-orphans

echo "Construindo e iniciando a nova versão..."
"${compose[@]}" up -d --build --remove-orphans

echo "Aguardando a API ficar saudável..."
for attempt in $(seq 1 60); do
  state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' innovation-api 2>/dev/null || true)"
  if [[ "$state" == "healthy" ]]; then
    echo "API saudável."
    "${compose[@]}" ps
    exit 0
  fi
  if [[ "$state" == "exited" || "$state" == "dead" ]]; then
    echo "ERRO: a API encerrou durante a inicialização." >&2
    "${compose[@]}" logs --tail=150 api >&2
    exit 1
  fi
  sleep 5
done

echo "ERRO: a API não ficou saudável dentro de 5 minutos." >&2
"${compose[@]}" ps >&2
"${compose[@]}" logs --tail=150 api >&2
exit 1
