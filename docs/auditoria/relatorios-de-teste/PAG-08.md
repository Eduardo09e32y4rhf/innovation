# PAG-08 - Vencimento e regua em UTC

- Problema: vencimento "amanha" via setUTCDate (22:00-23:59 BRT cai +2 dias); atraso/lembretes contados em UTC; crons 08:00/09:00 UTC.
- Documentacao: fuso do vencimento no Asaas NAO VERIFICADO (regra adotada: fuso do negocio America/Sao_Paulo, igual a date.utils.ts toDateOnly).
- Correcao: billing-dates.ts (saoPauloTomorrow, saoPauloDaysOverdue sobre toDateOnly); usados em platform-finance.service.ts (createInitialCharge e fatura MP) e billing-cron.service.ts (checkOverdueInvoices, sendPaymentReminders); esses dois @Cron com timeZone America/Sao_Paulo (08:00/09:00 locais).
- Arquivos: billing-dates.ts, billing-dates.spec.ts, platform-finance.service.ts, billing-cron.service.ts.
- Testes: `npx vitest run apps/api/src/modules/finance` -> 38 arquivos, 309 testes OK (4 novos: 23:30 BRT, virada de mes/ano, atraso). `npx tsc --noEmit -p apps/api` sem erros. Teste novo escrito junto do helper (sem execucao falha previa isolada).
- Sobra: outros crons (02:00-04:30 UTC) e datas de ciclo (setUTCMonth) nao migrados; regua de bloqueio muda no maximo 1 dia (comunicar).
