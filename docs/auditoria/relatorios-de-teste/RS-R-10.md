# RS-R-10 - Metricas: custo, SLA por etapa, tempo parado, origem e no-show

## Problema
`recruitment-metrics.ts` nao tinha custo nem prazo por etapa; nao havia campo de custo na vaga; a exportacao CSV era montada no navegador e sem custo/SLA.
Teste antes: `recruitment-cost-sla.spec.ts` nao carregava (`recruitment-costs`, `recruitment-sla` inexistentes).

## Documentacao / definicoes
- Custo por contratacao = (custo fixo das vagas + custos por canal) / contratados do periodo. E a definicao de mercado de "cost per hire" (SHRM/ANSI): **NAO VERIFICADO** em fonte oficial; nao ha norma legal. A formula esta visivel na tela e no CSV.
- SLA por etapa: prazo configuravel (`PipelineStage.slaDays`); decisao de produto, sem norma externa.
- CSV: `common/utils/csv.ts` do projeto (BOM UTF-8, `;`, protecao contra injecao de formula - OWASP CSV injection): VERIFICADO no codigo e coberto por teste.
- Valores de custo sao dado financeiro: so DEV, ADMIN e RH veem/alteram; gestor e RH - R&S recebem os relatorios sem valores (teste HTTP).

## Arquivos
- Migration `20261101030200_rs_r10_cost_sla` (`Job.costAmount`, `PipelineStage.slaDays`, tabela `JobSourceCost`) + `schema.prisma`.
- API: `recruitment-costs.ts`, `recruitment-sla.ts` (calculo puro), `recruitment-metrics.service.ts` (custo, SLA, no-show, `costs()`, `saveCosts()`, `exportCsv()`), `recruitment-metrics.controller.ts` (`GET export`, `GET/PUT jobs/:jobId/costs`, DTOs validados, auditoria `JOB_COST_UPDATED`), `dto/create-job.dto.ts` (`costAmount`), `jobs.controller.ts` (RH_RS recebe 403 ao informar custo), `dto/recruitment.dto.ts` + `recruitment.service.ts` (`slaDays` no funil), duplicar copia o custo.
- Web: `_components/metrics-cost-sla.tsx` (cartoes, barras de custo por origem e tempo por etapa x prazo, tabela de parados), `_components/job-costs.tsx` (painel Custos na vaga), `metrics/page.tsx` (CSV pelo servidor), `settings/page.tsx` (campo de prazo da etapa), wizard (custo), `jobs-api.ts`, `types.ts`, `payloads.ts`.
- Testes: `recruitment-cost-sla.spec.ts` (13), `recruitment-metrics-http.spec.ts` (4, Nest + Fastify reais), `jobs-duplicate.spec.ts`.

## Origem dos candidatos
Ja existia (`bySource`); agora tambem aparece custo por candidatura e por contratacao em cada origem.

## No-show
O cadastro de entrevistas ainda nao tem registro de comparecimento (pacote de entrevistas). O servico le `noShow` de `ApplicationInterview` quando a coluna existir (sem mudar codigo); ate la a tela diz "indisponivel". Interface esperada: booleano `noShow` por entrevista.

## Migrations
Postgres 16 limpo, baseline + todas as migrations >= 20261006100001, cada uma entre BEGIN/COMMIT: `prisma migrate diff ... --script` = "This is an empty migration." As 3 migrations deste pacote foram reaplicadas (idempotentes) sem erro.

## Resultado
`vitest apps/api/src/modules/jobs tests/contract tests/security`: 74 arquivos, 575+ testes passando; `tsc --noEmit -p apps/api` limpo; `typecheck:web` limpo; `lint:web` 0 erros.

## Riscos
- Custos por canal sao informados manualmente (nao ha integracao de faturas dos portais).
- Metricas leem ate 5000 candidaturas do periodo (limite ja existente).
