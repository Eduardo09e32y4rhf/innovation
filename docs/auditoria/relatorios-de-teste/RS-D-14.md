# RS-D-14: arquivos de candidatos cifrados em repouso

## Problema
Documentos do candidato ficavam em texto plano no disco e o PDF do aceite de privacidade ficava como base64 dentro da tabela `PrivacyConsent`. Antes: `file-crypto.ts` e `readConsentPdf` nao existiam.

## Documentacao
- Node.js `crypto`: AES-256-GCM (`createCipheriv`), `hkdfSync` (RFC 5869, HKDF-SHA256). VERIFICADO no codigo/API do Node 20+ (testes de ida e volta e adulteracao passam).
- LGPD art. 46 (medidas de seguranca tecnicas): VIA BUSCA; adequacao final e decisao do usuario/DPO.

## Desenho
- `apps/api/src/common/crypto/file-crypto.ts`: chave da empresa = HKDF-SHA256(`KMS_MASTER_KEY`, sal fixo, info = companyId); companyId tambem e AAD. Formato `IRF1 | iv12 | tag16 | cifrado`. Sem cabecalho = legado em texto plano (le normalmente).
- Sem `KMS_MASTER_KEY`: em producao o upload e recusado (503); fora dela grava plano e `encrypted=false`. A variavel ja e obrigatoria em producao (`env.validation.ts`), nenhuma variavel nova.
- `RecruitmentDocument.encrypted`. Upload cifra; download decifra (`openFile`); arquivo antigo e cifrado na propria leitura (`replace` atomico) e tambem em lote no cron diario (`encryptLegacyFiles`, 200/dia).
- `PrivacyConsent.pdfKey/photoKey`: `updatePdfBase64` grava o PDF cifrado no storage e zera `pdfBase64`; `readConsentPdf` le o arquivo ou migra o base64 antigo na primeira leitura. A selfie ja e proibida no aceite (`photoBase64` sempre vazio), `photoKey` fica reservado.
- Arquivos: `file-crypto.ts`, `jobs-storage.service.ts` (`replace`), `recruitment-documents.service.ts`, `privacy.repository.ts`, `privacy.service.ts`, migration `20261101020000`.

## Testes e saida real
```
npx vitest run apps/api/src/common/crypto apps/api/src/modules/jobs apps/api/src/modules/privacy tests/contract
 Test Files 63 passed, Tests 502 passed
npx tsc --noEmit -p apps/api -> sem erros
```
Novos: `file-crypto.spec.ts` (7), `recruitment-documents-storage.spec.ts` (7).

## Riscos / fora do escopo
- Curriculos (`Application.resumeUrl`) pertencem ao pacote da candidatura e nao foram migrados aqui; podem usar `sealFile`/`decryptForCompany`.
- Girar `KMS_MASTER_KEY` torna os arquivos atuais ilegiveis: exige reencriptar antes (nao ha rotacao automatica).
- `GeneratedDocument` (copia do PDF do termo para a lista de documentos da plataforma) continua no storage como antes.
