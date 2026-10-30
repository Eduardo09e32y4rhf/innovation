# RS-R-11 - Vaga PCD como atributo

## Problema
PCD existia so como dado do candidato (`CandidateDiversity.pcd`). A vaga nao tinha flag, selo publico, filtro no portal nem indicador de cota.
Teste antes: `job-pcd.spec.ts` (imports `pcd-quota` e DTO sem `pcd` inexistentes).

## Documentacao
- Lei 8.213/1991, art. 93 (cota: 100-200 empregados = 2%; 201-500 = 3%; 501-1.000 = 4%; acima de 1.000 = 5%): **VIA BUSCA** (WebSearch; as faixas coincidem em varias fontes juridicas; o texto no Planalto nao foi aberto). Arredondamento da fracao para cima: pratica do MTE, **NAO VERIFICADO**. Validacao juridica pendente do usuario/advogado.
- LGPD art. 5, II e art. 11 (dado de saude/deficiencia e sensivel): o indicador e agregado por empresa, visivel so a quem acessa os relatorios (DEV/ADMIN/RH/RH_RS/GESTOR); a contagem de contratados PCD usa apenas a declaracao voluntaria ja coletada no processo seletivo.

## Arquivos
- Migration `20261101030100_rs_r11_job_pcd` (`Job.pcd BOOLEAN NOT NULL DEFAULT false`) e `schema.prisma`.
- API: `dto/create-job.dto.ts` (`pcd` boolean), `jobs.repository.ts` (campo no select publico), `jobs.service.ts` (duplicar copia a flag), `job-templates.service.ts`, `pcd-quota.ts` (regra pura), `recruitment-metrics.service.ts` (`pcd.quota`, `pcd.openPcdJobs`).
- Web: `job-wizard.tsx` (checkbox), `types.ts`, `carreiras/_lib/public-jobs.ts`, `careers-catalog.tsx` (selo no cartao e filtro "Vagas para pessoas com deficiencia"), `job-details.tsx` (selo), `metrics/page.tsx` (cartao de cota).
- Teste: `job-pcd.spec.ts` (14 testes).

## Resultado
`vitest apps/api/src/modules/jobs tests/contract`: 62 arquivos, 501 testes passando; `tsc --noEmit -p apps/api` limpo. O filtro PCD no servidor entra com o RS-C-15 (busca no servidor).

## Riscos
- Nao ha campo de PCD no cadastro de funcionarios: "contratados PCD" = contratados via R&S que declararam PCD. A tela avisa para conferir com o cadastro oficial.
