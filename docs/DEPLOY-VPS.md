# Deploy na VPS

Fluxo único e seguro (não editar o compose para colocar segredos):

```bash
cd /var/www/innovation
bash scripts/security/bootstrap-env.sh https://seu-dominio.com.br   # 1ª vez: gera segredos fortes no .env
bash scripts/security/rotate-db-password.sh                         # 1ª vez: troca a senha do Postgres existente
bash scripts/backup/install-cron.sh                                 # 1ª vez: backup diário + teste semanal de restauração
bash scripts/deploy/vps-update.sh                                   # toda atualização
```

`vps-update.sh` faz: pull → backup → migrations pendentes → build/subida → verificação de saúde (e mostra o rollback se falhar).

## Regras
- Segredos só no `.env` da VPS (permissão 600). Nunca no repositório, no compose ou em chat.
- Em produção a API **recusa subir** com segredo fraco/ausente (veja `apps/api/src/config/env.validation.ts`).
- Postgres e Redis não ficam expostos; API e web escutam só em `127.0.0.1` (o proxy reverso do servidor faz a ponte).
- Cópia externa do backup: defina `BACKUP_REMOTE` (rclone). Sem isso o script avisa que só há cópia local.
- Pagamentos: preencha `ASAAS_*` e/ou `MERCADOPAGO_*` no `.env`; confira em `GET /api/finance/integrations/health?test=1`.

## Rotação de segredos
1. Edite o valor no `.env` (ou apague a linha e rode o bootstrap).
2. `JWT_SECRET`: derruba todas as sessões (esperado). `KMS_MASTER_KEY`: senhas provisórias já emitidas deixam de poder ser exibidas (gere outra).
3. `POSTGRES_PASSWORD`: rode `rotate-db-password.sh` antes de recriar a stack.