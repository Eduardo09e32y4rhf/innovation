# Runbook: backup, restauração e resiliência

Fontes: PostgreSQL, documentação "Backup and Restore" (pg_dump, pg_restore e Continuous Archiving / PITR); Redis, documentação de persistência e `requirepass`; Fastify, opção `trustProxy`. Os textos oficiais não abriram do container de teste, então os pontos de RPO/PITR abaixo precisam de conferência com o DBA.

## 1. Provar que o backup restaura (rodar antes de produção e mensalmente)

```bash
SOURCE_URL=postgresql://usuario:senha@host:5432/banco infra/scripts/backup-restore-verify.sh
```

O script faz `pg_dump -Fc`, restaura em um banco temporário (`innovation_restore_test`, apagado no fim) e compara tabela a tabela: contagem de linhas, soma de toda coluna numérica (Decimal, float, inteiros) e hash do conteúdo. Termina com código 1 se houver qualquer diferença. Foi testado com uma divergência injetada de R$ 0,01: o script a detectou.

Medido no banco de desenvolvimento (133 tabelas, 16 MB, dump de 440 KB): dump 0,3 s, restauração 1,8 s, 485 verificações, 0 diferença. **Rode em uma cópia do banco de produção** para obter o RTO real; o tempo cresce com o tamanho.

## 2. RPO e RTO

- **RPO hoje: até 24 h.** O backup diário roda à meia-noite (`BackupService`) e pelo cron do servidor (`scripts/backup/backup.sh`). Tudo gravado depois do último dump se perde numa falha.
- **Para baixar o RPO** para minutos: ligar o arquivamento de WAL com restauração a um ponto no tempo (PITR) do PostgreSQL. Decisão de infraestrutura, não feita aqui.
- **RTO** = tempo de restauração + religar a API (cerca de 12 s de boot). Medir em produção com o script acima.
- O `BackupService` grava `db_backup_*.sql`, mas o formato é custom (`-Fc`): restaure com `pg_restore`, não com `psql`.
- Cópia externa: `BACKUP_REMOTE` (rclone) precisa estar configurado, ou o backup fica no mesmo disco.

## 3. Comportamento quando uma dependência cai (testado)

| Cenário | Resultado medido |
|---|---|
| Redis cai durante a carga (240 GETs) | 0 respostas 5xx. API reconecta sozinha 2 s depois que o Redis volta |
| API sobe com o Redis já fora | No ar em 12 s, leituras sem 5xx, conecta 1 s depois que o Redis aparece |
| Banco cai por 10 s (280 requisições) | Todas as falhas são **503** (`DB_UNAVAILABLE`), 0 erros 500. Normal de novo no primeiro segundo após o banco voltar |

Regras: o Redis é opcional (cache, locks de cron e limite de WebSocket seguem sem ele). Só o banco é obrigatório.

Atenção: sem Redis, o `CronLock` deixa **todas as instâncias** rodarem o mesmo cron. Com mais de uma instância, trate queda de Redis como incidente.

## 4. Health checks

- `GET /health/live`: o processo responde. Não consulta banco nem Redis. **Use no healthcheck do contêiner.** Uma oscilação do banco não deve reiniciar a API.
- `GET /health/ready`: 200 só com o banco ok (com prazo de 2 s), senão 503. **Use no balanceador** para tirar a instância da rotação sem reiniciá-la.
- `GET /health`: diagnóstico completo (memória, banco, Redis).

## 5. O que o proxy precisa fazer (produção)

1. Terminar o TLS e redirecionar HTTP para HTTPS. A API já envia `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
2. Enviar `X-Forwarded-For`, `X-Forwarded-Proto` e `X-Real-IP`. O `nginx-lb.conf` usa `$proxy_add_x_forwarded_for` (acrescenta ao valor do cliente). Isso é seguro **somente** porque a API confia em uma lista de saltos (`TRUST_PROXY`) e pega o primeiro IP não confiável da direita para a esquerda (comportamento documentado do Fastify, não testado aqui). Se houver CDN ou outro proxy antes do nginx, inclua a faixa dele em `TRUST_PROXY`.
3. A API **não pode ser acessível diretamente** da internet (firewall só para o proxy). Se for, qualquer cliente forja o IP e escapa do limite de tentativas.
4. `TRUST_PROXY` (padrão `loopback,uniquelocal`): defina com as faixas reais do proxy (ex.: `10.0.0.0/8`). Nunca `true`.
5. Permitir upgrade de WebSocket (Socket.IO). Tamanhos: a API limita a 1 MB por padrão, 6 MB (logo da empresa), 14 MB (mídia do WhatsApp) e 10 MB (uploads); o `client_max_body_size` do proxy deve ser maior que o maior desses.
6. Em produção a API só sobe com: `JWT_SECRET` forte, `KMS_MASTER_KEY` (64 hex), `METRICS_TOKEN`, `ASAAS_WEBHOOK_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `ALLOWED_ORIGINS`, senha forte no banco e senha no Redis.

Conferido com `NODE_ENV=production`: CSP, HSTS, `nosniff`, `X-Frame-Options`, CORS só para a origem em `ALLOWED_ORIGINS` (origem estranha não recebe `Access-Control-Allow-Origin`), Swagger desligado (404) e `/metrics` com token (401 sem ele).
