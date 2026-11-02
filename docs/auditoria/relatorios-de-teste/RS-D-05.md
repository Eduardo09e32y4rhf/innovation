# RS-D-05 (parte documentos): assinatura eletronica simples reutilizavel

## Problema
Nao havia como provar o aceite de um documento gerado: so status e data. Antes: `SignedDocumentService`, a tabela `SignedDocument` e o hash do texto nao existiam.

## Documentacao e base legal (VALIDACAO JURIDICA PENDENTE do usuario/advogado)
- MP 2.200-2/2001, art. 10, par. 2: admite outros meios de comprovacao de autoria e integridade de documentos eletronicos, desde que aceitos pelas partes. Estado: VIA BUSCA (fonte secundaria; planalto.gov.br bloqueado nesta sessao).
- Lei 14.063/2020, art. 4, I: define assinatura eletronica simples (identifica o signatario e associa dados a ele). Estado: NAO VERIFICADO no texto oficial (a busca nao retornou o artigo); citado de memoria.
- **Pendente do advogado:** confirmar se a assinatura simples basta para cada tipo (declaracoes de dependentes/VT/VR e termos sim, em geral; contrato de trabalho e proposta podem exigir avancada/qualificada conforme a politica da empresa). A avancada (gov.br) pode reaproveitar `signed-pdf.rules.ts` (item opcional da planilha, nao feito).

## Implementacao
- `apps/api/src/modules/documents/signed-document.service.ts` (exportado por `DocumentsModule`): `sign`, `verify`, `read`, `list`.
- Evidencia: texto exato (`canonicalText`) + SHA-256, PDF final (PdfReport) + SHA-256, nome/e-mail/documento, IP, user agent, data/hora, versao do modelo. PDF cifrado em repouso (RS-D-14). Auditoria `SIGNED_DOCUMENT_CREATED` com os hashes.
- `verify` recalcula os dois hashes e acusa texto ou PDF adulterado. Falha ao gravar o registro remove o PDF.
- Tabela `SignedDocument` (migration `20261101020000_rs_documents_foundation`).

## Como o pacote das propostas usa
```ts
// no modulo: imports: [DocumentsModule]
constructor(private readonly signed: SignedDocumentService) {}
const { id, textHash, pdfSha256 } = await this.signed.sign({
  companyId, kind: 'PROPOSTA', title: 'Carta proposta', text: textoExatoQueOCandidatoViu,
  applicationId, signer: { name, email }, evidence: { ip: clientIp(request), userAgent: request.headers['user-agent'] },
  brand: { name: empresa.name, document: empresa.document, logoUrl },
});
```
O texto deve ser o mesmo que a tela exibiu (guardar a versao do modelo em `templateId`/`templateVersion`). O ip vem de `clientIp(request)`, nunca do corpo.

## Testes e saida real
`signed-document.service.spec.ts` (5): PDF real, hashes, evidencias, adulteracao de texto e de PDF, isolamento por empresa, rollback, auditoria. `npx vitest run apps/api/src/modules/documents` -> 5 passed. `npx tsc --noEmit -p apps/api` sem erros.

## Riscos
- Assinatura simples nao tem certificado ICP-Brasil; a forca probatoria depende da politica aceita pelas partes e de a identificacao do signatario ser confiavel (aqui: link pessoal + codigo por e-mail, RS-D-17).
