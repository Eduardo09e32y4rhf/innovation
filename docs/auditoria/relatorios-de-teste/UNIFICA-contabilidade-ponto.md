# UNIFICA: contabilidade, folha e ponto (API)

Merge de origin/main (theirs) na branch unifica-main (ours). Area: accounting, payroll, time-track.

## O que o theirs (29fbbf5b) mudou nos calculos
- `salary-period.ts` (novo): `monthlySalaryFraction`, salario proporcional por dias corridos de cada mes (ciclos 25-24 valem 1).
- `payroll-calculation.service.ts`: novo `salaryPeriodFraction`; DSR por falta passa a usar o salario cheio (`input.salary / 30`) e nao a base proporcional.
- `payroll.service.ts`: DSR do repouso (domingo ou primeiro dia de descanso) e fracao salarial; aprovacao exige `reconcilePayroll`.
- `time-closing.service.ts`: fracao do ciclo menos dias fora do contrato/ferias (`unpaidCalendarFraction`).
- `accounting-hub.service.ts`: totais via `accounting-totals.ts` (folha substitui a previsao do ponto), sem `take`, folhas CANCELLED fora, DSR recalculado na correcao, conferencia `reconcilePayroll` antes de aprovar, PDF por origem (Folha/Ponto).
- Novos: accounting-totals(.spec), accounting-recalculation.spec, payroll-reconciliation(.spec), salary-period.spec (mantidos intactos).

## Arquivo a arquivo
- `accounting.module.ts`: ours (controller e 3 services da folha manual; theirs nao tocou o modulo alem do que o ours ja tinha).
- `payroll/accounting-period.service.ts`: ours (select com `isManual` e deteccao de folha manual por `isManual` ou tipo).
- `payroll/payroll.service.ts`: uniao dos imports. Mantido ours (`MANUAL_ITEM_TYPES`, `ManualPayrollItemInput`, lancamentos manuais com autoria, `countDependents`) e theirs (`monthlySalaryFraction`, `reconcilePayroll`, DSR por dia de descanso). Corpo ja mesclado pelo git sem conflito.
- `time-track/time-track.service.ts`: ours (`outboundFetch` e `OnApplicationBootstrap` do backfill do ponto).
- `time-track/time-closing.service.ts`: theirs nos 4 trechos (`unpaidCalendarFraction`, `totalDaysInPeriod`, `fullCalendarMonth`). Os ajustes do ours (`contractDaysInPeriod`, `vacationDaysInPeriod`, INSS de ferias, dia da semana UTC) ficam; nao ha dupla contagem: com mes cheio vale o abatimento de ferias/contrato do ours (`isPartialMonth` falso), com ciclo parcial vale a fracao do theirs (o ours pula o abatimento quando `isPartialMonth`).
- `accounting/accounting-hub.service.ts`: imports unidos; construtor mantem `TimeTrackService` (ours); consultas, totais, DSR, conferencia e PDF do theirs; `loadEditablePayroll` publico (ours, usado pela folha manual) com o `select` ampliado (`workScale`, `workScheduleRule`) do theirs. Descontos pos-imposto: adotada a regra do theirs (`isDeduction` exceto falta/INSS/IRRF), a mesma de `reconcilePayroll`, para haver UMA definicao; ela engloba `POST_TAX_DEDUCTION_TYPES` do ours (import removido por ficar sem uso).
- `accounting-recalculation.spec.ts` (theirs): so ajustado o construtor para 6 argumentos (novo `timeTrack` do ours). Asserts intactos.

## Regra de ouro
Ponto (`time-closing`) e folha (`payroll.service`) chamam o mesmo `PayrollCalculationService.calculate`. Ambos os ajustes (fracao salarial e DSR do theirs; ferias/contrato/INSS de ferias do ours) valem no mesmo metodo.

## Testes
`npx vitest run apps/api/src/modules/accounting apps/api/src/modules/payroll apps/api/src/modules/time-track`
Resultado: 32 arquivos, 332 testes, todos passando.
Caso do usuario confirmado em `time-calculation-rules.spec.ts`: "segunda-feira com data-so (meia-noite UTC): 10h numa jornada de 9h = 1h extra 50%, sem adicional noturno" (05/10/2026), passando.
`tsc --noEmit -p apps/api` filtrado por accounting/payroll/time-track: 0 erros.
Sem marcadores de conflito nas tres pastas.

## Pendencias
- O hub (totais/PDF) ainda nao exibe a folha manual separadamente; o `needsRecalculation` do theirs depende da UI web (outra area).
- O front do theirs (`platform/_hub/accounting/*`) esta em conflito em outra area.
