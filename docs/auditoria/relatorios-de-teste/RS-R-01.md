# RS-R-01 - Aprovacao da requisicao notifica

## Problema
`JobWorkflowService` nao usava `RecruiterNotifierService`: ao pedir a aprovacao, ninguem era avisado; o fluxo ficava parado em PENDING_APPROVAL. Sem aviso do resultado ao solicitante, sem lembrete, e a fila `GET /job-workflow/pending` nao mostrava ha quantos dias a requisicao espera.
Teste que falhava antes: `apps/api/src/modules/jobs/job-workflow.service.spec.ts` (7 de 10 falharam: `startApproval` nao notificava, `decide` nao avisava, `remindStale` e `waitingDays` nao existiam).

## Documentacao consultada
- `@nestjs/schedule` (`@Cron`) e `CronLock` do projeto (`common/redis/cron-lock.decorator.ts`, documentado no proprio arquivo): VERIFICADO no codigo/README empacotado. Cron `0 12 * * 1-5` = 12:00 UTC (09:00 Sao Paulo), dias uteis.
- Regras de quem decide cada etapa: `STEP_ROLES` em `job-workflow.ts` (fonte unica; DEV decide mas nao e avisado).

## Arquivos
- `apps/api/prisma/migrations/20261101030000_rs_r01_approval_notify/migration.sql` e `schema.prisma` (`JobApproval.requestedBy`, `remindedAt`).
- `job-workflow.ts` (`APPROVAL_STALE_DAYS=3`, `approverRoles`, `waitingDays`), `job-workflow.service.ts` (aviso da vez, resultado, `remindStale`, fila com `waitingDays/overdue/requestedByName`), `recruiter-notifier.service.ts` (roles aceita qualquer `UserRole`), `jobs.service.ts`/`jobs.controller.ts` (passam o autor como solicitante).
- Web: `workflow-api.ts`, `_components/approvals-panel.tsx` (selo "Parada ha N dia(s)" e "pedida por").
- Testes: `job-workflow.service.spec.ts` (10 testes, tambem cobre `decide()`/`startApproval` do RS-R-14).

## Comportamento
- Ao pedir aprovacao e a cada etapa aprovada: e-mail para os usuarios ativos do perfil da etapa + aviso no sino para o perfil.
- Aprovada (todas as etapas): solicitante recebe e-mail "Requisicao de vaga aprovada". Recusada: e-mail com o motivo; a vaga volta a rascunho.
- Lembrete: etapa da vez sem decisao ha >= 3 dias gera lembrete (prioridade alta), no maximo um a cada 3 dias (`remindedAt`).
- Falha de e-mail/aviso nunca derruba a aprovacao (notificador engole e registra).

## Resultado
`npx vitest run ... apps/api/src/modules/jobs tests/contract`: 59 arquivos, 475 testes passando. `npx tsc --noEmit -p apps/api`: sem erros.

## Riscos / limites
- O aviso no sino vai ao PERFIL (nao ha notificacao por usuario no modulo notifications, que nao e deste pacote); o e-mail vai ao usuario. Para sino individual do solicitante, o modulo de notificacoes precisa aceitar `targetUserIds`.
- Etapa GESTOR avisa todos os gestores da empresa (nao ha vinculo gestor-vaga hoje).
- Validacao juridica: nao se aplica.
