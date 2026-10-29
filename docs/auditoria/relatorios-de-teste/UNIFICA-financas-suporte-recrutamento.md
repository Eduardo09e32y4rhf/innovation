# Unificacao: financas, suporte, recrutamento, schedule-hub, interceptors

Merge de origin/main em unifica-main (base 97a919d2). Dez arquivos em conflito, todos resolvidos; nenhum comando git de escrita foi usado.

## Arquivo a arquivo
| Arquivo | Ours (Onda 0) | Theirs | Resolucao |
|---|---|---|---|
| finance/asaas-webhook.processor.ts | `resolveStatus` por `payment.status`; `deletedAt` so muda em DELETED/RESTORED | `netValue`, guarda `remotelyPaid`, chargeback fiscal, planPricingForSubscription (auto-merge) | Mantido o ours nos dois conflitos; as adicoes do theirs seguem no arquivo. O `deletedAt` de theirs (`: null`) reabriria faturas removidas, por isso descartado. |
| finance/finance.controller.ts | Fastify (`FastifyReply`, `res.header().send()`) | Express (`res.setHeader`), mais rotas novas (auto-merge) | Ours (Express nao existe sob Fastify); rotas novas do theirs preservadas. |
| finance/payment-reconciliation.service.ts | Conciliacao do Mercado Pago (`reconcileMercadoPago`) | so Asaas | Ours; o corpo Asaas e identico ao do theirs. |
| finance/payment-refund.service.ts | `suspendAfterFullRefund` (estorno total suspende) | ouvintes `onSettled`, `failReservation`, fiscal (auto-merge) | Ours no conflito; chamada de `suspendAfterFullRefund` e os ganchos do theirs coexistem. |
| finance/platform-revenue-report.spec.ts | teste do CSV com Nest+Fastify real | teste com `res.setHeader` mock | Ours (teste do theirs validaria Express); adicionado `vi` ao import. |
| finance/webhook-reactivation.spec.ts | mocks `count` e `company.findUnique` exigidos pela reativacao condicionada | sem eles | Ours. |
| support/support-attachment.service.ts | antivirus fail-closed, extensao vinda de `inspectFile` | `inspectFile` + magic bytes antigos | Ours (ja contem a inspecao do theirs de forma equivalente e mais forte). |
| schedule-hub/hub.controller.ts | upload via `readMultipartUpload` (Fastify) | `ParseUUIDPipe` em employeeId | Ours, que ja valida o UUID com `ParseUUIDPipe` sobre os campos do multipart. |
| jobs/public-jobs.controller.ts | `TurnstileGuard` | `ApplyLimiter`/`assertApplyAllowed` (anti-abuso) | Ambos: guard do ours e limitador do theirs (imports unidos). |
| common/interceptors/audit.interceptor.ts | `TELEMETRY_ROUTES` | regex `SECRET_KEY` ampliada | Ambos (a regex veio no auto-merge). |

## Testes
`npx vitest run apps/api/src/modules/finance apps/api/src/modules/support apps/api/src/modules/schedule-hub apps/api/src/modules/jobs apps/api/src/common tests/security tests/contract`

Resultado: Test Files 129 passed (129); Tests 1073 passed | 3 expected fail (1076). Sem falhas.
`tsc --noEmit -p apps/api` filtrado por finance/support/schedule-hub/jobs/public/interceptors: sem erros.

## Pendencias
Nenhuma nesta area. O workflow de recrutamento (7c200646) entrou por auto-merge, sem conflito, e seus testes passam.
