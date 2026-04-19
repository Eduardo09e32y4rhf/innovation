# TODO_MIGRATE_TS_ARCH - Frontend TS + Backend TS + Python IA Workers

## 🎯 Arquitetura Dinâmica
```
Frontend: Next.js 15 + TS (dinâmico)
Backend: Nest.js + TS + Prisma (leve, typed)
Workers: Python (IA Gemini, automation)
DB: Postgres
```
**Vantagens:** TS end-to-end + Python só pesado necessário.

## ✅ Step 1: Backend Nest.js Skeleton
- [ ] apps/backend-ts/
- [ ] npm init @nestjs/cli
- [ ] Prisma schema.prisma (migrate models)
- [ ] Auth JWT module (/auth/login)

## ⏳ Step 2: Migrate Endpoints
- [ ] auth.py → auth.controller.ts
- [ ] jobs.py → jobs.controller.ts
- [ ] finance.py → finance.controller.ts
- Test API same endpoints

## ⏳ Step 3: Python Workers
- [ ] apps/python-workers/ (Gemini OCR, WhatsApp)
- [ ] Backend TS chama workers via HTTP/queue

## ⏳ Step 4: Frontend Update
- [ ] api.ts baseURL backend-ts:3001
- [ ] Remove Supabase total

## ⏳ Step 5: Deploy
- [ ] Railway/Vercel backend-ts
- [ ] Docker compose workers

**Status:** Backend Python → TS migration gradual, zero downtime.
**Command:** `mkdir apps/backend-ts && cd apps/backend-ts && npm init @nestjs/cli .`

Start?

