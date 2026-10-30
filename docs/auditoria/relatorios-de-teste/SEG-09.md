# SEG-09 — Guards opt-in: teste de contrato (camada 1) e avaliacao da camada 2

## Problema
`JwtAuthGuard`/`RolesGuard` nao sao globais e `RolesGuard` libera qualquer logado sem `@Roles`; nada impedia uma rota nova ficar aberta. Antes nao existia `tests/contract/controllers-guards.spec.ts`. Primeira execucao do teste novo (sem a regra de `GET /` do Prometheus) falhou com `GET /  (common/metrics/metrics.controller.ts)`, e uma rota temporaria `GET /zz/esquecida` sem guard fez o teste FALHAR (arquivo temporario removido) — prova de que ele detecta o esquecimento.

## Documentacao
- https://docs.nestjs.com/security/authentication (guards globais via `APP_GUARD` + decorator `@Public()` com `Reflector.getAllAndOverride`) — VIA BUSCA (host bloqueado; padrao confirmado por fontes secundarias e pelas docs v9 de guards).

## Camada 1 (feita)
`tests/contract/controllers-guards.spec.ts` carrega TODOS os arquivos com `@Controller` de `apps/api/src` (>60 controllers, >400 rotas) e le a metadata real (`__guards__`, `path`, `method`, `roles`):
1. Toda rota sem `JwtAuthGuard` (metodo ou classe) precisa estar em `ALLOWED` com justificativa; entrada velha em `ALLOWED` tambem falha. Rotas com guard proprio (candidato) devem declarar o guard (`CandidateAuthGuard`/`TurnstileGuard`).
2. A lista bate com o inventario da auditoria: 19 (01a) + 22 (01b) publicas conferidas contra os CSVs (`GET /metrics` = `GET /` do controller, montado pelo PrometheusModule).
3. `RolesGuard` sem `@Roles` so em 10 rotas "so logado" conhecidas (`LOGGED_IN_ONLY`).
Achado: `POST /ai/support/classify` (citado na auditoria) hoje tem `JwtAuthGuard`; nenhuma rota aberta por engano.

## Camada 2 (avaliada, NAO aplicada)
`RolesGuard` negar por padrao quebraria exatamente as 10 rotas de `LOGGED_IN_ONLY` (companies/me, faturas/permissoes/minhas e 8 de notifications), todas de modulos fora do meu grupo. Nao existe teste "permission-matrix" no repo (so `schedule-access-parity`). Proximo passo: criar `@AnyAuthenticated()` e migrar essas 10 rotas, depois inverter o padrao; `JwtAuthGuard` global com `@Public()` tem de migrar controller por controller. Decisao do usuario.

## Testes
`npx vitest run tests/contract/controllers-guards.spec.ts`: 3 testes passando (~11 s).

## Camada 2 (APLICADA, onda 1 grupo A)
Problema (antes): `roles.guard.spec.ts` novo falhou 2/4 (rota sem marca devolvia true; @AnyAuthenticated inexistente) e `controllers-guards.spec.ts` falhou 2/4 (20 rotas "so logado" sem marca).
Mudancas:
- `common/decorators/any-authenticated.decorator.ts` (`@AnyAuthenticated()`) e `common/decorators/public.decorator.ts` (`@Public()`, marca para a futura migracao ao guard global; o RolesGuard a respeita).
- `RolesGuard` agora NEGA por padrao: sem `@Roles` (ou `@Roles()` vazio), so passa com `@Public()` ou `@AnyAuthenticated()` (este exige `request.user`, senao 401); caso contrario 403.
- `@AnyAuthenticated()` aplicado nas 20 rotas "so logado": as 10 que rodavam RolesGuard sem @Roles (companies/me, faturas/permissoes/minhas, 8 de notifications) e as 10 de autosservico de `/auth` que so usam JwtAuthGuard (resend-verification, sessions, revoke-others, revokeSession, mfa status/setup/enable/disable, change-password, me).
- `tests/contract/controllers-guards.spec.ts`: novo teste "TODA rota tem uma das tres marcas" (com login: @Roles ou @AnyAuthenticated; sem JwtAuthGuard: listada em ALLOWED = publica declarada) e trava de que @AnyAuthenticated so existe nas 20 rotas conhecidas.
- Inventario antes da mudanca: 549 rotas com Jwt+Roles+@Roles, 10 Jwt+Roles sem @Roles, 10 so Jwt, 53 sem guard (todas em ALLOWED). Nao existe teste "permission-matrix" no repo.
Prova de que nada quebrou: `npx vitest run tests apps/api`: 275 arquivos, 3007 testes passaram (+155 expected fail preexistentes), `npx tsc --noEmit -p apps/api` sem erros. tests-e2e nao executado (precisa de stack no ar).
Ainda pendente (decisao futura): `JwtAuthGuard` global com `@Public()` nas 53 rotas publicas (migracao controller a controller).
