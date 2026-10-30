# RS-R-07 - Comparar 2 a 4 candidatos lado a lado

## Problema
Nao havia como comparar candidatos: o RH abria ficha por ficha. Faltava endpoint de leitura agregada e tela.
Teste antes: `candidate-comparison.spec.ts` nao carregava (modulos inexistentes).

## Documentacao
- Avaliacao cega do projeto (`blind-evaluation.ts`, `listFeedback` em `interview-followup.service.ts`): a comparacao reaproveita as MESMAS regras (nota/parecer de colegas so depois de o proprio usuario avaliar), sem criar caminho paralelo: VERIFICADO no codigo.
- LGPD (Lei 13.709/2018, art. 6, III - necessidade): a leitura nao traz dados de diversidade nem chaves/arquivos de documentos, so rotulo e situacao do documento. Validacao juridica: nao se aplica alem do ja adotado.

## Arquivos
- API: `candidate-comparison.ts` (regras: 2 a 4 ids distintos, media por criterio, destaque do melhor com empate), `candidate-comparison.service.ts` (agregacao + cego), `candidate-comparison.controller.ts` (`GET /jobs/:jobId/compare?ids=a,b,c`, roles DEV/ADMIN/RH/RH_RS/GESTOR, `assertJob` para respeitar o escopo), `jobs.module.ts`.
- Web: `_components/candidate-compare.tsx` (dialogo acessivel, tabela com cabecalho e primeira coluna fixos, rolagem horizontal em 360px), botao "Comparar" na barra de selecao do funil (kanban e tabela; tambem para RH - R&S, que nao tem acoes em lote), `jobs-api.ts`.
- Teste: `candidate-comparison.spec.ts` (7, inclui rota real Nest + Fastify: 200 para RH/RH_RS/GESTOR, 403 FUNCIONARIO, 400 para ids invalidos sem consultar o banco).

## Resultado
Notas por criterio (media entre avaliadores), media ponderada, pareceres por entrevistador (recomendacao, media, texto), respostas da triagem por pergunta, documentos (situacao), destaque do melhor por criterio.
`vitest apps/api/src/modules/jobs`: passando; `tsc --noEmit -p apps/api` limpo.

## Riscos
- A tela depende da selecao feita na tabela/funil (ate 4). Acima de 4 o botao fica desabilitado.
