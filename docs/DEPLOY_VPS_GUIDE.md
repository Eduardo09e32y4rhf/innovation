# INNOVATION RH CONNECT â€” PROMPT DE DEPLOY PARA O DEV

**Projeto:** Innovation RH Connect â€” Multi-tenant HR SaaS
**Stack:** NestJS + Prisma + PostgreSQL + Next.js 14 + Docker
**VPS:** 23.106.44.75 | Pasta: `/var/www/innovation.ia`
**Repo:** https://github.com/Eduardo09e32y4rhf/innovation

---

## âš¡ PROBLEMAS CONHECIDOS â€” CORRIJA ANTES DE QUALQUER DEPLOY

### âŒ PROBLEMA 1 â€” Dockerfile do Frontend: base image Alpine causa falha de build

**Sintoma:**
```
TypeError: Cannot read properties of undefined (reading 'os')
Failed to patch lockfile, please try uninstalling and reinstalling next
```

**Causa:** Next.js 14 com SWC nÃ£o Ã© compatÃ­vel com Alpine (musl libc) via lockfile de CI.

**Fix:**
```dockerfile
# âŒ REMOVER
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat

# âœ… SUBSTITUIR POR
FROM node:20-bookworm-slim AS builder
```

âš ï¸ TambÃ©m remova qualquer `RUN apk add` â€” sÃ£o comandos Alpine only.

---

### âŒ PROBLEMA 2 â€” Migration Prisma com tipo incompatÃ­vel (P3009)

**Sintoma:**
```
Error: P3009 â€” migration YYYYMMDDHHMMSS_add_management_and_aso failed
ERROR: foreign key constraint "management_events_companyId_fkey" cannot be implemented
DETAIL: Key columns "companyId" and "id" are of incompatible types: text and uuid.
```

**Causa:** No schema/migration, `companyId` foi declarado como `String` (TEXT) mas `Company.id` Ã© `UUID`.

**Fix no schema.prisma:**
```prisma
model ManagementEvent {
  id          String   @id @default(uuid()) @db.Uuid
  companyId   String   @db.Uuid          // â† GARANTIR @db.Uuid
  company     Company  @relation(fields: [companyId], references: [id])
  employeeId  String   @db.Uuid          // â† GARANTIR @db.Uuid
  employee    Employee @relation(fields: [employeeId], references: [id])
  // ...
}

model AsoRecord {
  id         String   @id @default(uuid()) @db.Uuid
  companyId  String   @db.Uuid            // â† GARANTIR @db.Uuid
  company    Company  @relation(fields: [companyId], references: [id])
  employeeId String   @db.Uuid            // â† GARANTIR @db.Uuid
  employee   Employee @relation(fields: [employeeId], references: [id])
  // ...
}
```

ApÃ³s corrigir, gere nova migration:
```bash
npx prisma migrate dev --name fix_management_aso_uuid_types
```

---

### âŒ PROBLEMA 3 â€” TypeScript no frontend: propriedade `description` faltando no init do modal

**Arquivo:** `apps/web/app/dashboard/management/page.tsx`

**Fix:**
```ts
// âŒ ANTES (incompleto)
const initModal = {
  title: '', eventType: '', status: '', priority: '',
  startDateTime: '', endDateTime: '', responsibleUserId: '', employeeId: ''
}

// âœ… DEPOIS
const initModal = {
  title: '', eventType: '', status: '', priority: '',
  startDateTime: '', endDateTime: '', responsibleUserId: '', employeeId: '',
  description: ''  // â† ADICIONAR
}
```

---

### âŒ PROBLEMA 4 â€” Nginx: config ativa Ã© `innovation-novo`, nÃ£o `innovation.ia`

Verificar o arquivo: `/etc/nginx/sites-available/innovation-novo`

O bloco `/api/` deve fazer proxy para `127.0.0.1:3333` (porta real da API):

```nginx
location /api/ {
    proxy_pass         http://127.0.0.1:3333/api/;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection 'upgrade';
    proxy_set_header   Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

âš ï¸ A API roda na porta **3333**, nÃ£o 3000. Confirmar antes de cada deploy.

---

## âœ… CHECKLIST PRÃ‰-PUSH (SEMPRE FAZER)

Antes de qualquer commit, validar localmente:

```bash
# TypeScript sem erros
cd apps/web && npx tsc --noEmit
cd apps/api && npx tsc --noEmit

# Build do web (deve passar 100%)
npm run build:web

# Build da api
npm run build:api

# Prisma schema vÃ¡lido
npx prisma validate --schema apps/api/prisma/schema.prisma
```

---

## ðŸ”„ SEQUÃŠNCIA DE REDEPLOY NA VPS

```bash
cd /var/www/innovation.ia

# 1. Puxar cÃ³digo atualizado
git fetch https://github.com/Eduardo09e32y4rhf/innovation.git main
git reset --hard FETCH_HEAD

# 2. (Se migration foi modificada) Limpar migration travada do banco
docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres \
  psql -U innovation_user -d innovation \
  -c "DELETE FROM _prisma_migrations WHERE finished_at IS NULL;"

# 3. Derrubar e rebuildar tudo
docker compose -f docker-compose.prod.yml --env-file .env down
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# 4. Aguardar startup + migrate automÃ¡tico
sleep 25

# 5. Validar
curl -i https://vps8369.panel.icontainer.net/api/health
curl -I https://vps8369.panel.icontainer.net/login
```

**Resultado esperado:**
- `/api/health` â†’ `HTTP/1.1 200 OK`
- `/login` â†’ `HTTP/1.1 200 OK`

---

## ðŸ” DIAGNÃ“STICO RÃPIDO (quando der 502)

```bash
cd /var/www/innovation.ia

# Ver status dos containers
docker ps

# Ver logs da API (Ãºltimas 80 linhas)
docker logs innovation-api --tail 80

# Ver config do Nginx ativa
cat /etc/nginx/sites-available/innovation-novo

# Recarregar Nginx apÃ³s mudar config
nginx -t && systemctl reload nginx
```

---

## ðŸ“‹ VARIÃVEIS DE AMBIENTE OBRIGATÃ“RIAS (.env)

```env
# Banco
POSTGRES_USER=innovation_user
POSTGRES_PASSWORD=<senha>
# Se o volume do Postgres ja existia, esta senha precisa ser a mesma usada na criacao original do volume
POSTGRES_DB=innovation
POSTGRES_HOST_PORT=5435

# API
DATABASE_URL=postgresql://innovation_user:<senha>@postgres:5432/innovation
JWT_SECRET=<secret longo>
NODE_ENV=production
PORT=3333

# Frontend
NEXT_PUBLIC_API_URL=https://vps8369.panel.icontainer.net/api
```

âš ï¸ `DATABASE_URL` aponta para `postgres:5432` (service name Docker), nÃ£o localhost.

---

## ðŸ—ï¸ ARQUITETURA DOS CONTAINERS

| Container | Porta interna | Porta no host | ObservaÃ§Ã£o |
|-----------|--------------|---------------|------------|
| innovation-api | 3333 | 127.0.0.1:3333 | NestJS â€” Nginx faz proxy |
| innovation-web | 8080 | 0.0.0.0:8080 | Next.js static export |
| innovation-postgres | 5432 | 127.0.0.1:5435 | SÃ³ acesso local |
| innovation-redis | 6379 | â€” | Apenas internal Docker |

---

*Gerado em 25/06/2026 â€” Innovation RH Connect VPS Deploy Guide*
