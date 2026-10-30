# RS-R-09 - Auditoria das acoes de vaga + tela de historico

## Problema
`AuditLog` so existia na exclusao permanente e na revisao de documentos. Criar, editar, publicar, encerrar, duplicar, mover etapa e exportar dados nao deixavam rastro; nao havia tela de historico.
Teste antes: `job-audit.spec.ts` nao carregava (modulos `job-audit` e `job-audit.service` inexistentes).

## Documentacao
- Modelo `AuditLog` do proprio schema (`entity`, `entityId`, `metadata`, indices `[entity, entityId, createdAt]`): VERIFICADO no `schema.prisma`.
- LGPD (Lei 13.709/2018, art. 37 - registro das operacoes de tratamento; art. 6, X - responsabilizacao): o log guarda SOMENTE nomes de campos alterados, ids e contagens, nunca salario, nome ou dado pessoal do candidato (minimizacao, art. 6, III). Validacao juridica do prazo de retencao do log: PENDENTE do usuario/advogado.

## Arquivos
- `job-audit.ts` (regras puras: acoes, rotulos, `changedFields`, `statusAction`), `job-audit.service.ts` (`record` via `repository.audit`, `recordBulkMove`, `history`).
- `jobs.service.ts` (criar, editar, publicar/pausar/encerrar/reabrir/enviar p/ aprovacao, duplicar, arquivar, excluir rascunho), `jobs.controller.ts` (`GET /jobs/:id/history`, roles DEV/ADMIN/RH/RH_RS + `assertJob`), `recruitment.controller.ts` (mover etapa, mover em lote, exportar CSV), `job-templates.service.ts`/`job-workflow.controller.ts` (autor ao criar por modelo), `jobs.module.ts`.
- Web: `_components/job-history.tsx`, botao "Historico" em `[jobId]/page.tsx`, `jobs-api.ts`.
- Teste: `job-audit.spec.ts` (9 testes).

## Resultado
`vitest apps/api/src/modules/jobs tests/contract tests/security`: 70 arquivos, 542 testes passando (3 expected fail preexistentes). `tsc --noEmit -p apps/api`: limpo. Falha de auditoria so gera warn e nao derruba a acao.

## Riscos
- Contratacao tem auditoria propria no pacote de contratacao (fora do escopo).
- Historico limitado a 100 linhas por consulta (maximo 300).
