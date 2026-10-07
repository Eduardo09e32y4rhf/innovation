# RELATORIO-AUDITORIA (fase 1: inventario e linha de base)

Branch: `audit/reconstrucao-20261007` (a partir de `main` @ `db4ce805`). Sem merge, sem deploy.

## Linha de base executada (2026-10-07)

| Comando | Resultado |
|---|---|
| `npm run prisma:validate` | OK |
| `npm run prisma:generate` | OK (necessario apos o pull: cliente antigo gerava 30+ erros TS falsos em `platform-finance.service.ts`) |
| `npm run typecheck:api` | OK apos generate |
| `npm run typecheck:web` | OK |
| `npm run lint:web` | OK, apenas warnings (hooks `exhaustive-deps`, `<img>`) |
| `npm run test:unit` | 96 arquivos / 539 testes passando |
| `npm run test:integration` | NAO executado: sem Docker e sem confirmacao de PostgreSQL local de teste |
| `npm run test:e2e`, `npm run build`, `npm run db:deploy` | NAO executados nesta fase |

## Numeros do repositorio
- 37 pastas em `apps/api/src/modules`; 105 models Prisma; 16 migrations; 96 paginas Next.js; 57 arquivos em `tests/` + `tests-e2e/tests`.
- Perfis reais (`enum UserRole`): DEV, CEO, CONTABIL, COMERCIAL, ADMIN, RH, RH_RS, GESTOR, FUNCIONARIO, CONSULTA. Candidato nao e UserRole (fluxo publico).
- CI: ci, codeql, deploy, e2e, release, rollback.

## Lacunas confirmadas contra o plano (por busca no schema/codigo)
1. **Sem modelo `IdempotencyKey`**, e nenhum uso de header `Idempotency-Key` confirmado (busca ainda a refazer com `Get-ChildItem | Select-String`; a primeira tentativa falhou por erro de sintaxe). Idempotencia existe ao menos em cobranca (`chargeRequestKey` em `PlatformInvoice`).
2. **Sem `OutboxEvent`, `JobExecution`, `WebhookEvent`** no schema: eventos/jobs/webhooks nao tem trilha persistida propria.
3. **Sem model `Refund` dedicado** (devolucao esta como campos em `PlatformInvoice`, ex. `refundedAmount`).
4. **Sem tabela de sessao/refresh token com esse nome**: verificar como refresh rotativo/revogacao e persistido.
5. Modulos sem nenhum spec: ai, communication, companies, dashboard, documents, holidays, notifications, onboarding, partners, payroll, performance, platform, platform-hub, privacy.
6. Envelope de resposta: existem `response.interceptor.ts` e `plain-json.interceptor.ts` (dois formatos). Conferir se coincide com `{data, meta{requestId,timestamp}}` do plano.
7. Cron: existe `redis/cron-lock.decorator.ts`; falta auditar se todo `@Cron` o usa.
8. Sem Docker nesta maquina: testes com PostgreSQL real e verificacao de Dockerfile/compose ficam para CI ou outra maquina.

## Proximos passos propostos (ordem do plano)
1. Request ID + envelope/erros padronizados (validar interceptor/filter existentes).
2. Auth: sessoes, MFA, revogacao concorrente (ja ha `session-concurrency.spec.ts`).
3. Tenant scope e matriz de permissoes por perfil (gerar MATRIZ-PERFIS-PERMISSOES a partir dos `@Roles`).
4. Schema: IdempotencyKey, OutboxEvent, JobExecution, WebhookEvent, Refund via migration aditiva.
5. Demais modulos conforme secao 11 do plano.

## Riscos residuais
- Documentos restantes do plano (ARQUITETURA-ALVO, CONTRATOS-API, MAQUINAS-DE-ESTADO, MODELO-DADOS, PLANO-MIGRACAO, INFRAESTRUTURA-E-OPERACAO, OBSERVABILIDADE-E-RUNBOOKS, PLANO-DE-TESTES, MATRIZ-PERFIS-PERMISSOES) ainda nao foram escritos.
- Nenhuma correcao de codigo foi feita nesta fase.
