# Backup remoto cifrado (R2 / B2)

O repositório é público e os dados são pessoais (LGPD): **nada sai da VPS sem cifrar**. `BACKUP_REMOTE=s3` liga o envio; sem as variáveis o `backup.sh` se comporta como antes.

## Como funciona
`scripts/backup/backup.sh` gera o `.sql.gz` e o `uploads_*.tar.gz`, cifra cada um com `openssl enc -aes-256-cbc -pbkdf2` (senha em `BACKUP_ENCRYPTION_PASSPHRASE`), grava o `.sha256` do arquivo cifrado e envia só os `.enc` com `rclone` em container (`rclone/rclone`, nada instalado no host). Depois apaga no remoto o que tem mais de `BACKUP_REMOTE_RETENTION_DAYS` (padrão 30). Sem passphrase (ou sem qualquer `BACKUP_S3_*`) o script falha **antes** de gerar o dump.

## Configurar (10 GB grátis)
1. Cloudflare R2 (ou Backblaze B2): crie um bucket privado e uma chave de API restrita a esse bucket.
2. Copie as variáveis de `.env.example.backup` para o `.env` da VPS (arquivo fora do git). Gere a passphrase: `openssl rand -base64 32` e guarde uma cópia em gerenciador de senhas, fora da VPS.
3. Teste: `bash scripts/backup/backup.sh` e depois `bash scripts/backup/restore-check.sh`.

## Verificação (`restore-check.sh`)
Baixa o último `innovation_*.sql.gz.enc`, confere sha256, decifra, roda `gunzip -t` e valida o conteúdo do dump (CREATE TABLE e rodapé; `pg_restore --list` se for formato custom). Usa pasta temporária; **não toca no banco real**.

## Cron
O `install-cron.sh` já agenda o backup (03:15). Acrescente a verificação remota semanal:
```
45 4 * * 0 cd /caminho/innovation && bash scripts/backup/restore-check.sh >> storage/backups/restore-check.log 2>&1 # innovation-backup
```
## Restaurar de verdade
Baixe o `.enc`, `openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in arq.sql.gz.enc -pass env:BACKUP_ENCRYPTION_PASSPHRASE | gunzip | docker compose -f docker-compose.prod.yml exec -T db psql -U innovation -d innovation_db` (siga o RUNBOOK em `infra/RUNBOOK-backup-e-resiliencia.md`).
