# RS-D-09 e RS-D-16: lista de documentos por vaga/cargo, kits por contrato e tipos com regras

## Problema
- `model Job` nao tinha lista de documentos; `hireKitFor` so conhecia CLT e PJ; nao havia estagio, aprendiz nem temporario.
- Todo documento aceitava os mesmos formatos (PDF/PNG/JPEG), sem regra por tipo (diploma deveria aceitar `ALLOW.CERTIFICATE`, foto nao deveria aceitar PDF).
- Antes: nenhum teste cobria esses comportamentos (as funcoes `kitFor`, `docTypeForLabel`, `hiringKitStatus` nao existiam).

## Documentacao consultada
- Regra do projeto: `ALLOW.CERTIFICATE` em `apps/api/src/common/utils/file-validation.ts` (VERIFICADO no codigo).
- LGPD art. 11, II, "a" (obrigacao legal/regulatoria para dado sensivel): VIA BUSCA (planalto.gov.br bloqueado na sessao; varias fontes secundarias reproduzem o texto). CLT art. 168 e NR-7 (ASO admissional): NAO VERIFICADO online. **A validacao juridica das bases legais registradas e do usuario/advogado.**

## Arquivos
- `apps/api/src/modules/jobs/recruitment-doc-types.ts` (tipos, regras de formato/validade/sensivel, kits CLT/PJ/ESTAGIO/APRENDIZ/TEMPORARIO, `resolveRequiredDocuments`).
- `recruitment-documents.rules.ts` (`detectDocumentType(buffer, formats)`), `recruitment-documents.service.ts` (`kitForApplication`, `hiringKitStatus`, upload por tipo), `recruitment-documents.controller.ts` (`GET /jobs/applications/:id/document-kit`).
- Vaga: `Job.requiredDocuments` (Json `[{label, required}]`), DTO `RequiredDocumentDto`, `jobs.service.ts` (normaliza e copia ao duplicar).
- Migration `20261101020000_rs_documents_foundation`.
- Web: wizard da vaga (secao "Documentos da admissao", so este campo), `candidate-documents.tsx` (pre-carrega a lista/kit), `jobs-api.ts`, `types.ts`.
- Teste: `recruitment-doc-types.spec.ts` (10 testes).

## Assinatura para o pacote da contratacao
```ts
RecruitmentDocumentsService.hiringKitStatus(applicationId: string, companyId?: string)
  : Promise<{ required: string[]; approved: string[]; missing: string[] }>
```
`required` = itens obrigatorios da vaga (ou do kit do contrato) + tudo que ja foi pedido ao candidato; `approved` = versao vigente APROVADA; `missing` = required nao aprovado. Passe `companyId` sempre que o conhecer (filtra a candidatura). Lanca 404 se a candidatura nao existir naquela empresa.

## Comandos e saida real
```
npx vitest run apps/api/src/modules/jobs tests/contract  -> Test Files 59 passed, Tests 475 passed
npx tsc --noEmit -p apps/api -> sem erros
npm run typecheck:web -> sem erros ; npm run lint:web -> 0 errors (196 warnings pre-existentes)
```

## Antes x depois
- Antes: kit CLT/PJ fixo, mesmo formato para tudo. Depois: lista por vaga, 5 kits, formato por tipo (foto so PNG/JPEG, diploma com WEBP), aprovacao exige vencimento nos tipos que pedem (ver RS-D-11).

## Riscos
- O tipo e inferido do rotulo (texto livre); rotulo novo cai em `OUTRO` (formatos padrao). O RH pode escolher rotulos do catalogo para regras especificas.
- Bases legais sao leitura tecnica; revisar com advogado.
