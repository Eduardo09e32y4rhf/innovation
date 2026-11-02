# RS-R-15 - Duplicar vaga copia prazo e recrutadores

## Problema
`JobsService.duplicate` nao copiava `deadline` nem os responsaveis (`JobRecruiter`). Modelos de carta-proposta ficam com o pacote de documentos (fora deste item).
Teste antes: `jobs-duplicate.spec.ts` - 3 de 3 falharam (deadline undefined; `copyRecruiters` inexistente).

## Regra adotada (decisao de produto, sem norma externa)
- Prazo futuro: copiado. Prazo ja vencido: nao copiado (a copia nasceria expirada); a resposta traz `deadlineReset: true` para a tela avisar.
- Responsaveis: copiados com `skipDuplicates`; quem duplica fica de fora da copia porque o controller o atribui (RH_RS) via `assignCreator`, que usa `create` e quebraria com a chave unica `[jobId,userId]`.

## Arquivos
`jobs.service.ts` (duplicate), `jobs.repository.ts` (`copyRecruiters`), `jobs-duplicate.spec.ts`.

## Resultado
`vitest apps/api/src/modules/jobs/jobs-duplicate`: 3/3 passando; area completa e `tsc --noEmit -p apps/api` sem erros (ver commit seguinte para a rodada completa).

## Riscos
- Um RH (nao RH_RS) que era responsavel e duplica nao entra como responsavel da copia; RH ve todas as vagas, sem impacto de acesso.
