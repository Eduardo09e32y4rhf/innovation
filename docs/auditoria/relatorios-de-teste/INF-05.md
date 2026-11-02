# INF-05: rotina interna de backup da API desligada

## Problema
`apps/api/src/database/backup.service.ts` (confirmado): @Cron meia-noite, `pg_dump` no container da API, sem cliente Postgres e sem volume. Teste novo em backup.service.spec.ts: 6 falhas antes (executava exec).

## Documentacao
pg_dump/regra 3-2-1: NAO VERIFICADO (bloqueado), sem mudanca de comportamento de dados.

## Correcao
Desligada por padrao: so `INTERNAL_DB_BACKUP_ENABLED=true` roda; senao loga que o backup oficial e scripts/backup/backup.sh (docs/BACKUP-REMOTO.md). Variavel nao repassada ao compose (nao funcionaria no container). Comentario em infra/alerts.yml: CronParado_Backup nao monitora o backup real. Docs: BACKUP-REMOTO.md.

## Testes
backup.service.spec.ts: 9 passam (2 antigos + 7 novos).

## Nao feito
Configurar BACKUP_REMOTE/restore-test (operacional, do usuario), volume api_data no backup, `verify-remote.sh` e alerta de 26 h, RPO/RTO. Conferir: `crontab -l`, `grep BACKUP_REMOTE .env | sed 's/=.*/=<definido>/'`.
