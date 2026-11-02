# SEG-tabelas-globais

**Problema:** `POST /accounting/rules` e `DELETE /accounting/rules/:id` (tabela global `PayrollTaxTable`: INSS, IRRF, FGTS, parametros CLT; sem companyId) herdavam `@Roles('DEV','CEO','CONTABIL')`; qualquer CONTABIL/CEO de qualquer escritorio criava versao ou desativava, alterando a folha de todas as empresas. Unico controller com tabela global (grep em accounting/payroll/platform); `deduction-rules` e por empresa, fora do escopo.

**Documentacao:** https://docs.nestjs.com/guards - NAO VERIFICADO (host fora da rede da sessao). Regra usada do codigo do projeto: `RolesGuard` -> `getAllAndOverride([handler, class])`, `@Roles` do metodo sobrepoe o da classe; DEV sempre passa.

**Arquivos:** `accounting/accounting.controller.ts` (`@Roles('DEV')` em saveRule/deactivateRule); novo `accounting/accounting-global-tables.spec.ts`; web: `platform/_hub/accounting-view.tsx` (prop `canEditRules`) e `contabilidade/page.tsx` (`canEditRules={role==='DEV'}`), para a tela nao oferecer botoes que dao 403.

**Antes:** spec novo 2 falhas / 4 (CONTABIL e CEO escreviam).
**Depois:** `vitest run management accounting payroll tests/contract tests/security tests/unit/web` -> 59 arquivos, 639 passed, 3 expected fail; `npm run typecheck:web` ok. GET rules e POST rules/simulate seguem para DEV, CEO, CONTABIL. `tsc -p apps/api` aponta 1 erro fora do meu escopo (`finance/payment-access.ts:33`, edicao de outro agente).
