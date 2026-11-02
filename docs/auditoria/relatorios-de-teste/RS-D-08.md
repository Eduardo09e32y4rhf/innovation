# RS-D-08: dados sensiveis (PCD/CID, antecedentes, vacina, ASO)

## Problema
ASO, antecedentes, vacina e laudo PCD/CID tinham o mesmo tratamento de um RG: qualquer perfil de recrutamento (inclusive RH - R&S) abria o arquivo, a leitura nao tinha trilha propria e o log de erro de gravacao trazia a chave do arquivo e a mensagem de erro bruta.

## Documentacao
- LGPD art. 5, II e art. 11 (dado pessoal sensivel; hipoteses taxativas), art. 11 II "a" (obrigacao legal/regulatoria): VIA BUSCA (planalto.gov.br bloqueado; ver RS-D-09).
- Lei 8.213/1991 art. 93 (cota PCD), CLT art. 168 / NR-7 (ASO): NAO VERIFICADO online.
- **As bases legais gravadas em `DOC_TYPE_RULES[...].legalBasis` sao leitura tecnica; validacao juridica pendente do usuario/advogado.** Antecedentes criminais so devem ser exigidos quando a lei ou a natureza do cargo justificar; o RH decide ao montar a lista da vaga.

## Implementacao
- Categoria sensivel por tipo (`ASO`, `ANTECEDENTES`, `VACINA`, `LAUDO_PCD`) com base legal gravada no documento no upload (`RecruitmentDocument.sensitive/legalBasis`).
- Leitura somente `RH`, `ADMIN`, `DEV` (`canReadSensitive`); `RH_RS` e demais recebem 403 ao baixar ou conferir; na lista veem o estado, mas o nome do arquivo vem mascarado (`restricted`).
- Auditoria de LEITURA: `RECRUITMENT_SENSITIVE_DOCUMENT_READ` com `documentId`, `docType` e base legal; sem nome de arquivo, URL ou chave. Auditoria de aprovacao/devolucao ja existente.
- Upload tipado do ASO: pelo tipo `ASO` o upload passa por `inspectFile` (assinatura binaria, PDF ativo bloqueado), ClamAV (`CandidateDocumentScanner`) e e cifrado em repouso (RS-D-14). Nao ha upload de ASO do lado do RH nesta entrega (o `EmployeeAsoRecord.attachmentId` e do modulo de funcionarios).
- Candidato ve aviso de dado sensivel no link (transparencia, art. 9).
- Logs: erro de gravacao registra so codigo/nome do erro e a candidatura.

## Testes e saida real
`recruitment-documents-sensitive.spec.ts` (8 testes): categorias, perfis, 403 sem auditoria, auditoria da leitura sem vazar chave/nome, mascara na lista, log sem caminho.
```
npx vitest run apps/api/src/modules/jobs tests/contract -> Test Files 62 passed, Tests 500 passed
npx tsc --noEmit -p apps/api ; npm run typecheck:web -> sem erros
```

## Riscos
- `PCD` como flag na candidatura (pacote da candidatura) nao foi alterada; o laudo/CID enviado como documento segue esta regra.
- O tipo vem do rotulo do item; rotulo livre com saude/antecedentes que nao case o catalogo sera tratado como `OUTRO` (nao sensivel). Use o catalogo.
