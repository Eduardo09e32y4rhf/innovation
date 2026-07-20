# ADR-001 — Arquitetura Oficial Atual

**Data:** 2026-07-20
**Status:** Aprovada
**Decisores:** Eduardo (DEV)

---

## Contexto

O projeto Innovation RH passou por diversas experimentações de arquitetura durante o desenvolvimento.
Este documento consolida a stack oficial aprovada e proíbe o retorno de arquiteturas removidas sem uma nova ADR.

---

## Stack Aprovada

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 com App Router |
| Backend | NestJS |
| Linguagem | TypeScript |
| Banco de dados | PostgreSQL |
| ORM | Prisma |
| Cache e filas | Redis + BullMQ |
| Cobrança | Asaas |
| Autenticação | JWT (access token) |
| WhatsApp | Sessão global administrada exclusivamente pelo DEV |
| Deploy | Docker Compose na VPS |
| Proxy e TLS | Caddy |
| CI/CD | GitHub Actions |

---

## Arquiteturas Removidas

As seguintes tecnologias foram experimentadas e **definitivamente removidas**:

| Tecnologia | Motivo da remoção |
|---|---|
| FastAPI (Python) | Stack unificada em TypeScript/NestJS |
| Uvicorn / Gunicorn | Dependência do FastAPI |
| Python | Nenhuma dependência restante |
| Flutter | Escopo reduzido — app mobile fora do MVP |
| Supabase Auth | Substituído por JWT próprio |
| Mercado Pago | Substituído por Asaas |
| Vercel (deploy) | Substituído por Docker na VPS |
| `agent-canvas/` | Ferramenta interna experimental removida |
| Kubernetes (`deploy_k8s.ps1`) | Complexidade desnecessária para o porte atual |

---

## Regra

> **Nenhuma arquitetura removida poderá retornar sem uma nova ADR aprovada pelo DEV.**

---

## Estrutura de Diretórios Oficial

```
/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── tests-e2e/        # Testes end-to-end (Playwright)
├── infra/            # Caddyfile, configurações de infraestrutura
├── scripts/          # Utilitários de desenvolvimento local
├── docs/             # Documentação técnica e ADRs
│   └── architecture/ # ADRs (Architecture Decision Records)
├── docker-compose.yml         # Ambiente de desenvolvimento local
├── docker-compose.prod.yml    # Produção
└── package.json               # Workspace npm root
```

---

## Módulos do Backend

Módulos NestJS em `apps/api/src/modules/`:

| Módulo | Responsabilidade |
|---|---|
| `auth` | Login, registro, sessões, reset de senha |
| `users` | Gestão de usuários e permissões |
| `companies` | Dados cadastrais e contratuais de empresas |
| `employees` | Funcionários, importação Excel |
| `finance` | Billing, Asaas, webhook, planos, precificação |
| `proposals` | Propostas comerciais |
| `platform` | Console administrativo (DEV/COMERCIAL) |
| `communication` | WhatsApp global (somente DEV) |
| `notifications` | Notificações internas |
| `time-track` | Controle de ponto |
| `schedule` | Escalas de trabalho |
| `vacations` | Férias |
| `management` | Gestão operacional (ASOs, comprometimentos) |
| `holidays` | Feriados |
| `people-management` | Módulo RH adicional |
| `privacy` | LGPD e consentimentos |
| `queue` | Fila de jobs (BullMQ) |
| `dashboard` | KPIs e métricas |
