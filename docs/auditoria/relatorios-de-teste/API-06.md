# API-06: rotas sobrepostas e granularidade de acesso

## Problema (confirmado)
- `GET /job-workflow/jobs/:id/approvals`: GESTOR, CEO e CONTABIL liam as aprovacoes de QUALQUER vaga da empresa (e RH_RS fora do seu escopo de responsaveis). Teste novo `job-workflow-access.spec.ts` falhou 6/6 antes (metodo inexistente).
- `GET /schedules/:id`: NAO confirmado como excesso. Devolve o modelo de escala (jornada) da empresa, o mesmo conteudo de `GET /schedules`, sem dado de colaborador; escopo de equipe nao tem o que filtrar. Limite correto = papel (`calendar.read`) + empresa. Registrado por teste (`schedule-get-one-access.spec.ts`).

## Documentacao
n/a (regra interna; catalogo diz "n/a").

## Correcao
- `JobWorkflowService.approvalsFor(companyId, jobId, actor)`: DEV/ADMIN/RH/RH_RS veem tudo; GESTOR so a vaga com etapa de Gestor; CEO/CONTABIL so a vaga com etapa Financeiro (lista vazia nas demais, sem revelar existencia).
- Controller: `JobScopeService.assertJob` antes (404 para vaga de outra empresa ou fora do escopo RH_RS).
- Front: sem mudanca de contrato (lista vazia em vez de erro).
- Sobreposicao `/schedules/*` x `/escalas/*`: decisao de modulo canonico fica com o usuario (o front usa as duas famílias); nada deprecado aqui.

## Testes
`npx vitest run apps/api/src/modules/jobs apps/api/src/modules/schedule`: 37 arquivos, 276 testes passaram (6 novos de papel x recurso + 2 de schedule). `npx tsc --noEmit -p apps/api`: sem erros.
