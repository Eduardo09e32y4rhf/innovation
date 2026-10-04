# Baseline Diagnóstico — pre-quality-hardening-67a260b6
**Branch:** `release/1.1.1-quality-hardening`
**Tag de Congelamento:** `pre-quality-hardening-67a260b6`
**Data:** 2026-07-25
**Commit HEAD:** `67a260b6` — docs: atualizar readme com hash e versão V. 25-07-2026 - 1.1.0.0

---

## 1. Comandos Executados

```bash
npm ci
npm run check:workspace
npm run prisma:validate
npm run prisma:generate
npm run lint:web
npm run typecheck:api
npm run typecheck:web
npm run test:api
npm run build:api
npm run build:web
```

---

## 2. Resultados por Comando

### `npm ci`
- **Status:** OK
- **Pacotes instalados:** 1010 pacotes, 1013 auditados
- **Vulnerabilidades:** 28 (4 moderadas, 24 altas)

### `npm run check:workspace`
- **Status:** OK — estrutura base do workspace verificada

### `npm run prisma:validate`
- **Status:** OK — schema válido
- **Nota:** Prisma 6.19.3 instalado; major upgrade 7.9.0 disponível

### `npm run prisma:generate`
- **Status:** OK — Prisma Client gerado

### `npm run lint:web`
- **Status:** OK com 22 warnings (0 erros bloqueadores)
- **Arquivos afetados:** 12 arquivos
- **Regras:** `react-hooks/exhaustive-deps` (16 ocorrências), `@next/next/no-img-element` (6 ocorrências)

### `npm run typecheck:api`
- **Status:** OK — 0 erros de tipagem

### `npm run typecheck:web`
- **Status:** OK — 0 erros de tipagem

### `npm run test:api`
- **Status:** OK
- **Motor:** Node.js `--test` nativo (NÃO usa Vitest ou Jest)
- **Arquivos executados:** `apps/api/test/*.test.cjs` apenas
- **Testes aprovados:** 4
- **Testes reprovados:** 0
- **Testes ignorados / fora da suíte:** Todos os arquivos em `src/` nunca executam

| Teste | Duração |
|---|---|
| calcula preços oficiais para dez usuários | 1.9ms |
| desconto incide somente sobre a base | 0.35ms |
| rejeita quantidade de licenças inválida | 1.24ms |
| valida CPF e CNPJ com dígitos verificadores | 529ms |

### `npm run build:api`
- **Status:** OK — 0 erros

### `npm run build:web`
- **Status:** OK com warnings não-bloqueadores
- **Warnings:** `Failed to patch lockfile` (ENOWORKSPACES — swc); `face-api.esm.js` Critical dependency
- **Rotas compiladas:** 44 rotas

---

## 3. Rotas de Produção (Build)

**Dinâmicas (Server-Rendered):**
- `/[tenant]/dashboard` e sub-rotas
- `/[tenant]/dashboard/platform` e todas as sub-rotas da plataforma
- `/[tenant]/dashboard/support`
- `/[tenant]/dashboard/time-track`

**Estubs (173 B — Páginas vazias):**
- `/[tenant]/dashboard/chat`
- `/[tenant]/dashboard/colaboradores`
- `/[tenant]/dashboard/finance`
- `/[tenant]/dashboard/jobs`
- `/[tenant]/dashboard/media`
- `/[tenant]/dashboard/notifications`
- `/[tenant]/dashboard/ponto`
- `/[tenant]/dashboard/rh`

---

## 4. Débitos Técnicos Identificados

| # | Severidade | Área | Descrição |
|---|---|---|---|
| D-01 | CRITICO | Testes | Apenas 4 testes reais. Zero cobertura de autorização, SLA, financeiro, IA, E2E |
| D-02 | CRITICO | Testes | Suíte usa Node `--test` nativo. Testes em `src/` nunca executam |
| D-03 | CRITICO | Segurança | 28 vulnerabilidades npm (24 altas, 4 moderadas) sem triagem |
| D-04 | CRITICO | Suporte | Páginas usam dados demonstrativos fictícios quando API falha |
| D-05 | CRITICO | Contrato | Frontend usa URLs de suporte divergentes do backend NestJS |
| D-06 | CRITICO | IA | Consumo de tokens não persistido (somente em memória) |
| D-07 | CRITICO | Financeiro | MRR calculado por estimativa, não por soma real de assinaturas |
| D-08 | ALTO | Lint | 22 warnings de `react-hooks/exhaustive-deps` causando re-renders |
| D-09 | ALTO | Build | `face-api.esm.js` com `require()` não estático |
| D-10 | ALTO | Imagem | 6 ocorrências de `<img>` sem `next/image` (LCP degradado) |
| D-11 | ALTO | E2E | `baseURL` do Playwright aponta para VPS de producao |
| D-12 | ALTO | E2E | `.catch(() => {})` mascara falhas nos testes E2E |
| D-13 | ALTO | CI | CI usa `prisma db push` em vez de `prisma migrate deploy` |
| D-14 | MEDIO | Rotas | 8 rotas dinâmicas com 173 B (páginas vazias sem implementação) |
| D-15 | MEDIO | Attachments | Controller de suporte sem endpoints de upload/download conectados |
| D-16 | MEDIO | PDFs | Geração não unificada no backend |
| D-17 | MEDIO | Formulários | Endpoints públicos sem DTO forte, rate limit ou honeypot |

---

## 5. Cobertura Atual

| Módulo | Unitário | Integração | Contrato | Segurança | E2E |
|---|---|---|---|---|---|
| Preços / Licenças | 4 testes | 0 | 0 | 0 | 0 |
| Suporte | 0 | 0 | 0 | 0 | 0 |
| Plataforma | 0 | 0 | 0 | 0 | 0 |
| Financeiro / MRR | 0 | 0 | 0 | 0 | 0 |
| IA / Guardrails | 0 | 0 | 0 | 0 | 0 |
| Documentos / PDF | 0 | 0 | 0 | 0 | 0 |
| Autorização / RBAC | 0 | 0 | 0 | 0 | 0 |
| **GERAL** | **~5%** | **0%** | **0%** | **0%** | **0%** |

---

## 6. Riscos de Deploy

- BLOQUEADOR: Dados fictícios vazam para producao quando API falha
- BLOQUEADOR: Sem validação real das regras de acesso por perfil
- BLOQUEADOR: Consumo de tokens de IA nao rastreado
- ALTO: 28 vulnerabilidades npm nao triadas
- ALTO: E2E apontando para VPS de producao

---

*Gerado em: 2026-07-25 | Versao: pre-quality-hardening-67a260b6*
