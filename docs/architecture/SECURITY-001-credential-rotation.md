# SECURITY-001 — Credenciais Expostas e Rotação

**Data:** 2026-07-20
**Status:** Executado
**Bloco:** BLOCO 00 — Backup, Segurança e Congelamento

---

## Credenciais Encontradas e Removidas do Código

### 🔴 E-mail do DEV — ROTACIONAR SE NECESSÁRIO

| Arquivo | Tipo | Ação |
|---|---|---|
| `apps/api/prisma/seed-realistic-demo.ts` | E-mail real hardcoded | ✅ Movido para `DEV_EMAIL` |
| `apps/api/src/modules/auth/auth.service.ts` | E-mail real hardcoded | ✅ Movido para `PLATFORM_OWNER_EMAIL` |
| `apps/api/src/modules/platform/platform.service.ts` | E-mail real hardcoded | ✅ Movido para `PLATFORM_OWNER_EMAIL` |
| `apps/api/src/modules/users/users.service.ts` | E-mail real hardcoded | ✅ Movido para `PLATFORM_OWNER_EMAIL` |
| `apps/web/app/[tenant]/dashboard/users/page.tsx` | E-mail real hardcoded | ✅ Movido para `NEXT_PUBLIC_PLATFORM_OWNER_EMAIL` |

### 🔴 Senha real — ROTACIONAR NA VPS

| Arquivo | Tipo | Ação |
|---|---|---|
| `apps/api/prisma/seed-realistic-demo.ts` | Senha `Innovation@123` hardcoded | ✅ Movido para `SEED_DEFAULT_PASSWORD` |
| `apps/api/src/modules/employees/employees.service.ts` | Senha padrão `Innovation@123` via env | ⚠️ Usar `DEFAULT_EMPLOYEE_PASSWORD` na env |

### 🔴 Chave de produção exposta — ROTACIONAR IMEDIATAMENTE

| Arquivo | Tipo | Ação |
|---|---|---|
| `scripts/deploy_vps_completo.sh:103` | `SECRET_KEY=831941797...` (JWT legado Python) | ⚠️ **Rotacionar na VPS se ainda estiver em uso** |

> Esta chave pertence ao sistema antigo FastAPI/Python. Se a VPS ainda usa essa chave em produção, ela **deve ser rotacionada imediatamente**.

### 🟡 Senhas de teste E2E — Aceitáveis em repositório privado, mas documentar

| Arquivo | Tipo | Decisão |
|---|---|---|
| `tests-e2e/specs/*.spec.js` | `Teste@123`, `Admin123!` | ✅ Aceitável — são senhas de contas de teste locais |
| `tests-e2e/debug-vps.js:20` | `575031eb86` (senha real) | 🔴 **Rotacionar imediatamente** |
| `tests-e2e/deploy-vps.js:22` | `575031eb86` (senha real) | 🔴 **Rotacionar imediatamente** |
| `tests-e2e/specs/venda-real.spec.js:46` | `575031eb86` (senha real) | 🔴 **Rotacionar imediatamente** |

### 🟡 JWT_SECRET local (fallback)

| Arquivo | Tipo | Ação |
|---|---|---|
| `apps/api/src/config/env.validation.ts` | Fallback `innovation-rh-connect-local-development-secret` em dev | ✅ Aceitável em desenvolvimento |
| `apps/api/src/config/app.config.ts` | Fallback idêntico | ✅ Aceitável em desenvolvimento |
| Validações de produção | Estavam **comentadas** | ✅ **Descomentadas e ativadas** |

---

## Variáveis de Ambiente Adicionadas

Adicionar ao `.env` de produção na VPS:

```env
PLATFORM_OWNER_EMAIL=seu-email-real@dominio.com
DEV_EMAIL=seu-email-real@dominio.com
DEV_SEED_PASSWORD=<senha forte gerada>
SEED_DEFAULT_PASSWORD=<senha forte gerada>
```

Adicionar ao `.env` do frontend (Next.js):

```env
NEXT_PUBLIC_PLATFORM_OWNER_EMAIL=seu-email-real@dominio.com
```

---

## Rotações Manuais Necessárias

> **EXECUTAR NA VPS ANTES DE CONTINUAR PARA PRODUÇÃO**

```bash
# 1. Gerar novo JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 2. Gerar novo ASAAS_WEBHOOK_TOKEN
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Invalidar SECRET_KEY legada (831941797...) — se ainda estiver em uso no servidor antigo
# Trocar no arquivo .env da VPS e reiniciar o container
```

---

## Validações de Produção Ativadas

A partir deste commit, o servidor **recusará iniciar** em produção se:

- `ALLOWED_ORIGINS` não estiver definido
- `ASAAS_WEBHOOK_TOKEN` não estiver definido
- `PLATFORM_OWNER_EMAIL` não estiver definido
- `JWT_SECRET` tiver menos de 32 caracteres ou conter strings de desenvolvimento
- `DATABASE_URL` remoto não usar SSL

---

## Status

- [x] Credenciais removidas do código-fonte
- [x] `.gitignore` atualizado para backups de banco
- [x] `.env.example` atualizado com novas variáveis obrigatórias
- [x] Validações de produção ativadas
- [ ] Rotação manual de `575031eb86` na VPS (**fazer manualmente**)
- [ ] Rotação manual de `SECRET_KEY=831941797...` se ainda em uso (**fazer manualmente**)
- [ ] Adicionar `PLATFORM_OWNER_EMAIL` ao `.env` de produção na VPS (**fazer manualmente**)
