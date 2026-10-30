# UNIFICA-web: resolucao de conflitos em apps/web

## Arquivo a arquivo
- `lib/api.ts`: ours queria tipos e metodos da folha manual (PayrollSheet*, payrollSheet, validation, export, itens, recalculate) e o import de `turnstileHeaders`; theirs nao tocava nesses trechos (lados vazios). Mantido ours inteiro; as mudancas do theirs (144 linhas) entraram sem conflito.
- `contexts/AuthContext.tsx`, `carreiras/_lib/public-jobs.ts`: conflito so no import de `turnstileHeaders`. Mantido (Turnstile do ours).
- `contabilidade/page.tsx` e `platform/_hub/accounting-view.tsx`: mantida a prop `canEditRules` (regras so DEV escreve) do ours.
- `contabilidade/_employee-drawer.tsx` e `_month-view.tsx`: mantidos PayrollSheet editavel, PayrollTools, refresh/version e a prop `payroll`; adotado o titulo "Ajustes manuais (calculado x ajustado)" do theirs.
- `accounting/competencia.tsx`: adotados os textos/KPIs do theirs (apuracao, Retencoes + FGTS, CSV com Folhas/sem folha, needsRecalculation bloqueando aprovacao, linhas de totais). `Obligations` continua recebendo `month`.
- `accounting/parts.tsx`: `Obligations` aceita `month` opcional; mostra o selo "Valores para conferencia" e o texto de estimativa do theirs, mais o vencimento dia 20 do ours.
- `accounting/dialogs.tsx`: adotado o theirs (WorkflowBar com `blocked`, detalhamento proventos/descontos, aviso de recalculo). Perde apenas a lista antiga "Salario base/Horas extras/Adicional noturno" do ours, substituida pelas linhas detalhadas.
- `jobs/settings/page.tsx`: import com `StageAutomation` (theirs, superconjunto).
- `app/page.tsx`: theirs (botao de cookies com `min-h-11`, alvo de toque para 360px).

## Testes
- `npm run typecheck:web`: sem erros.
- `npx vitest run tests/unit tests/contract`: 49 arquivos, 521 testes passando (uma execucao anterior teve 4 falhas em `tests/contract/vps-deploy.spec.ts`, area de infra; passaram na reexecucao).
- `npm run lint:web`: 0 erros, so warnings preexistentes.

## Pendencias
- Conferir visualmente a folha editavel contra o formato final da API de contabilidade resolvida pelo outro agente (campos como `needsRecalculation`, `items`).
