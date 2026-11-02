# API-04: POST de consulta/acao devolvendo 201

## Problema
`tests/contract/http-status-routes.spec.ts` (novo) leu a metadata real dos controllers: antes da correcao 2 de 3 testes falharam (rotas da tabela sem `@HttpCode(200)`; e 8 acoes extras achadas pela heuristica de verbo: password-reset/confirm, refund approve/reject, close/reopen de suporte, users/:id/cancel).

## Documentacao
RFC 9110 15.3.1 (200) e 15.3.2 (201 = recurso criado): https://www.rfc-editor.org/rfc/rfc9110.html. Host bloqueado (403 do proxy). Busca devolveu so a numeracao das secoes: NAO VERIFICADO o texto; VIA BUSCA a numeracao.

## Correcao
`@HttpCode(200)` em 52 POSTs de consulta/previa/acao (lista em `EXPECT_200` do teste): auth (login, mfa/verify, refresh, logout, verify-email, revoke-others, validate-code, password-reset/confirm, public-plans/quote), simulacoes e previas (accounting, termination, schedules/escalas, employees/import), acoes de recrutamento, time-closing, suporte, IA, promotions, proposals, users/:id/cancel.
Mantidos 201 de proposito (criam recurso): `jobs/:id/duplicate`, `communication/messages/send`, e os dois checkout (`finance/company/checkout`, `faturas/empresa/checkout`; finance e de outro grupo).
DELETE: nao alterado (200 com corpo; o front le o envelope `{success,data}`).
Front/e2e: `apps/web/app/lib/api.ts` usa `res.ok` (nao compara 201); grep em apps/web, tests-e2e e tests nao achou dependencia de 201 alem de `tests/contract/ai-controller-contract.spec.ts` (atualizado para 200, inject Nest+Fastify real).

## Testes
`tests/contract/http-status-routes.spec.ts`: 3 testes (tabela rota x 200, criacoes seguem 201, nenhuma acao com verbo conhecido esquecida em 201). Suite `tests/contract tests/security tests/unit apps/api`: 266 arquivos, 2316 testes passaram, 3 expected fail preexistentes. `npx tsc --noEmit -p apps/api`: sem erros.

## Riscos que sobram
Cliente externo que cheque `=== 201` nessas rotas (nenhum conhecido no repo). Outros POSTs de acao fora do vocabulario da heuristica (ex.: users block/unblock, payroll periods) continuam 201; ampliar `ACTION_WORDS` se desejado.
