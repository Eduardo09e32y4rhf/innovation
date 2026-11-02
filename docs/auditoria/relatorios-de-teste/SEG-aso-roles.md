# SEG-aso-roles

**Problema:** `AsoController` (management) tinha `@Roles('DEV','ADMIN','RH','GESTOR','CEO','CONSULTA')` na classe; GESTOR, CEO e CONSULTA criavam/alteravam/apagavam ASO e presets de clinica.

**Documentacao:**
- https://docs.nestjs.com/guards - NAO VERIFICADO (host docs.nestjs.com fora da rede permitida da sessao: ENOTFOUND). Regra aplicada a partir do codigo do projeto: `RolesGuard` usa `reflector.getAllAndOverride(ROLES_KEY, [handler, class])`, logo `@Roles` no metodo sobrepoe o da classe; DEV sempre passa.
- Matriz do projeto: `apps/web/app/lib/role-access.ts` `asoManage = DEV, ADMIN, RH` (RH_RS nao tem escrita), `asoView = DEV, ADMIN, RH, GESTOR, CEO, CONSULTA`; `tests/unit/web/permission-matrix.spec.ts` (asoView/asoManage).

**Arquivos:** `apps/api/src/modules/management/aso.controller.ts` (+`@Roles('DEV','ADMIN','RH')` em POST/DELETE clinic-presets, POST, PATCH, DELETE); novo teste `apps/api/src/modules/management/aso-roles.spec.ts` (RolesGuard real + metadado real).

**Antes:** `vitest run aso-roles.spec.ts` -> 5 falhas / 10 (GESTOR passava em todas as escritas).
**Depois:** `vitest run apps/api/src/modules/management tests/unit/web/permission-matrix.spec.ts tests/security` -> 17 arquivos, 126 passed, 3 expected fail (preexistentes); `npx tsc --noEmit -p apps/api` sem erros. Leitura inalterada para os 6 perfis; escrita 403 para GESTOR, CEO, CONSULTA, RH_RS, FUNCIONARIO, CONTABIL, COMERCIAL.
**Criterios:** web e API concordam (permission-matrix verde). Obs.: literais no `@Roles` porque o parser da matriz nao le spread.
