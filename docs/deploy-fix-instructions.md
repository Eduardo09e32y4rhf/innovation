# InstruÃ§Ãµes de Deploy e CorreÃ§Ã£o â€” VPS 23.106.44.75

**Projeto:** `/var/www/innovation.ia`
**Data:** 2026-06-24

---

## PROBLEMA 1 â€” Migration quebrada (P3009)

**Sintoma:** `prisma migrate deploy` falha com erro de tipo incompatÃ­vel em FK.

**Arquivo:** `apps/api/prisma/migrations/YYYYMMDDHHMMSS_add_management_and_aso/migration.sql`

### CorreÃ§Ã£o jÃ¡ aplicada no repositÃ³rio
- Colunas `companyId`, `employeeId`, `responsibleUserId`, `createdBy` agora sÃ£o `UUID`
- Adicionado `DROP TABLE IF EXISTS` no inÃ­cio para idempotÃªncia
- FKs apontam para `"Company"("id")` e `"Employee"("id")`

### Passos na VPS

1. Limpar migration travada:
```bash
cd /var/www/innovation.ia
docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres psql -U innovation_user -d innovation -c "DELETE FROM _prisma_migrations WHERE migration_name LIKE '%add_management_and_aso%' AND finished_at IS NULL;"
```

2. Aplicar migration:
```bash
cd /var/www/innovation.ia
docker compose -f docker-compose.prod.yml --env-file .env exec -T api npm run db:deploy
```

---

## PROBLEMA 2 â€” Nginx 502 Bad Gateway

**Sintoma:** API retorna 502 para `/api/*`

**Causa:** Proxy do Nginx apontando para endereÃ§o/porta incorretos.

### CorreÃ§Ã£o

1. Verificar config ativa:
```bash
cat /etc/nginx/sites-available/innovation-novo
```

2. Garantir que o bloco `/api/` aponte para a porta correta:
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3333/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

3. Testar e recarregar:
```bash
nginx -t && systemctl reload nginx
```

---

## PROBLEMA 3 â€” (verificado, sem aÃ§Ã£o)

Docker-compose jÃ¡ expÃµe a API corretamente:
```yaml
ports:
  - "127.0.0.1:3333:3333"
```

---

## SEQUÃŠNCIA DE REDEPLOY COMPLETA

```bash
cd /var/www/innovation.ia

# Limpar migration travada
docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres psql -U innovation_user -d innovation -c "DELETE FROM _prisma_migrations WHERE migration_name LIKE '%add_management_and_aso%' AND finished_at IS NULL;"

# Aplicar migrations
docker compose -f docker-compose.prod.yml --env-file .env exec -T api npm run db:deploy

# Subir tudo
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# Validar
sleep 15
curl -i https://vps8369.panel.icontainer.net/api/health
curl -I https://vps8369.panel.icontainer.net/login
```

---

## COMMITS RELEVANTES

```
7fb8e703 feat: script vps-final-deploy.sh para aplicar migration e validar
a9fe685e fix: Dockerfile web com --force para lockfile Next.js corrompido
cee9acdc fix: migration Gestao com UUID nas FKs e DROP TABLE idempotente
9649260b fix: TypeScript no frontend - responsibleUserId no init do EventModal
195a51e1 fix: TypeScript corrections for Management module
0e5e4643 fix: Prisma schema - mover relacoes de Vacation para Employee
da180916 feat: modulo Gestao com Agenda e ASO + menu lateral
```

---

## NOTAS

- O script `scripts/vps-final-deploy.sh` jÃ¡ existe no repositÃ³rio e automatiza parte do processo
- Frontend (login) jÃ¡ estÃ¡ retornando 200 â€” problema Ã© apenas na API
- NÃ£o usar `prisma migrate reset` (nÃ£o apagar dados)
- NÃ£o mexer em migrations antigas
