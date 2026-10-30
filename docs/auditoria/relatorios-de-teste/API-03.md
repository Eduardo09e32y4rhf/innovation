# API-03: modulo de IA (Onda 1, grupo G2)

## Problema (confirmado)
`POST /ai/support/ticket/:id/summarize`, `/suggest-reply` e `/ai/platform/company/:id/summary` devolviam 200 com texto "nao encontrado". `POST /ai/support/classify` tinha so `JwtAuthGuard` (qualquer perfil/empresa gastava credito). Teste que falha: `tests/contract/ai-controller-contract.spec.ts` (4 de 5 falharam antes).

## Documentacao
RFC 9110 15.5.5 (404): https://www.rfc-editor.org/rfc/rfc9110.html#name-404-not-found , NAO VERIFICADO (host bloqueado, ENOTFOUND). docs.nestjs.com tambem bloqueado: `@Throttle({ default: { limit, ttl } })` e `@Roles` seguem o uso ja existente no repositorio (public-support.controller.ts), VERIFICADO no codigo. Escolha dos perfis: o proprio controller de suporte da plataforma usa `@Roles('DEV','COMERCIAL')`; DEV passa sempre no RolesGuard.

## Correcao (`apps/api/src/modules/ai/ai.controller.ts`)
- `NotFoundException` nos 3 casos (mensagens em portugues preservadas).
- `classify`: `RolesGuard` + `@Roles('DEV','COMERCIAL')` + `@Throttle` 10/min por usuario/IP.

## Resultado
`npx vitest run tests/contract/ai-controller-contract.spec.ts tests/unit/ai`: 5 passaram no contrato (apos corrigir um import quebrado, commit seguinte); tsc ok. `tsc --noEmit -p apps/api`: ok. Front: `api.ts` declara `classify` mas nenhuma tela o usa.

## Pendencias / riscos
- `OPENAI_MONTHLY_BUDGET` e orcamento GLOBAL (`ai-usage.service.ts`), nao por tenant: decisao do usuario se quer limite por empresa.
- Perfil desejado (so DEV+COMERCIAL) e uma escolha; ampliar se o suporte usar outro papel.
