#!/usr/bin/env bash
# Roda o deploy em segundo plano, desligado do terminal: sobrevive à queda do terminal do painel ou do navegador do celular.
# Uso:  bash scripts/deploy/vps-update-bg.sh [sha|main] [--prebuilt]
#       tail -f storage/deploy-*.log        (acompanhar; Ctrl+C sai do tail SEM parar o deploy)
set -Eeuo pipefail

cd "$(dirname "$0")/../.."
mkdir -p storage
LOG="storage/deploy-$(date +%Y%m%d-%H%M%S).log"
SCRIPT="${DEPLOY_SCRIPT:-scripts/deploy/vps-update.sh}"

setsid nohup bash "$SCRIPT" "$@" > "$LOG" 2>&1 < /dev/null &
PID=$!
echo "Deploy iniciado em segundo plano (PID $PID)."
echo "Log: $LOG"
echo "Acompanhe com:  tail -f $LOG"
echo "Termina com 'Deploy saudável: <sha>' ou com 'FALHA'."
