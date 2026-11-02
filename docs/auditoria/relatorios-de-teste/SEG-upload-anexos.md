# SEG-upload-anexos: uploads, downloads e antivirus dos anexos

## Problema
1. A API roda sob `FastifyAdapter`, mas varios controllers usavam APIs do Express e davam **500**:
   - `support.controller.ts` (upload com `FileInterceptor`/multer; download com `res.set` + `stream.pipe(res)`);
   - `schedule-hub/hub.controller.ts` (upload de atestado com `FileInterceptor`; download com `stream.pipe(reply)`);
   - `schedule-hub/punch/punch.controller.ts` (PDF do recibo de ponto com `res.set`/`res.end`; o caminho real e `schedule-hub/punch`, nao `time-track`);
   - achados na varredura (`grep -rn` em `apps/api/src`): `finance.controller.ts` (`monthly.csv` com `res.setHeader`) e `vacations.controller.ts` (`receipt.pdf` com `response.setHeader`); tipos `import('express')` em `finance/faturas.controller.ts`.
2. Antivirus dos anexos de suporte: o download so bloqueava `REJECTED` (QUARANTINED/SCANNING eram entregues); o scan marcava `CLEAN` quando `isInfected` vinha `null`; o tipo/nome/mimetype gravados vinham do que o cliente declarou; o status era checado antes da autorizacao.

## Documentacao consultada
| Fonte | Regra usada | Situacao |
|---|---|---|
| README de `@fastify/multipart` 10.1.0 (lido em `node_modules`) | `req.parts()/req.file(options)` aceitam `limits` por requisicao; `toBuffer()` lanca `RequestFileTooLargeError` acima de `fileSize`; arquivo nao consumido trava a requisicao; ordem dos campos importa (por isso lemos todas as partes em ordem) | VERIFICADO |
| `node_modules/fastify/docs/Reference/Reply.md` (Fastify 5.12.5) | stream se envia com `reply.send(stream)`; cabecalhos com `reply.header()`; sem Content-Type, stream vira `application/octet-stream` | VERIFICADO |
| Helper do repo `contentDisposition()` (`common/pdf/pdf-response.ts`) | remove CR/LF/aspas, ASCII + `filename*` UTF-8 | VERIFICADO (lido e testado) |
| https://docs.nestjs.com/techniques/file-upload | uso de multer/FileInterceptor com Fastify | **NAO VERIFICADO** (host bloqueado na rede da sessao: `ENOTFOUND`). Decisao tomada pela README do `@fastify/multipart` e pelo comportamento reproduzido nos testes (multer exige `req.on` do Express) |
| https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html | allowlist de tipos, validar conteudo, renomear, limite de tamanho, antivirus | **NAO VERIFICADO** (host bloqueado). Praticas aplicadas por conhecimento geral, nao por leitura da pagina |

## Arquivos alterados
- novo `apps/api/src/common/http/multipart-upload.ts` (le multipart sob Fastify, 1 arquivo, limite por requisicao -> 413, campos antes/depois do arquivo, 415 se nao for multipart);
- `support/support.controller.ts`, `support/support-attachment.service.ts`;
- `schedule-hub/hub.controller.ts`, `schedule-hub/punch/punch.controller.ts` (usa `sendPdf`);
- `finance/finance.controller.ts`, `finance/faturas.controller.ts`, `vacations/vacations.controller.ts`;
- testes novos: `support/support-attachments.http.spec.ts`, `support/support-attachments-antivirus.spec.ts`, `schedule-hub/hub-attachments.http.spec.ts`, `schedule-hub/punch/punch-receipt.http.spec.ts`, `vacations/vacation-receipt.http.spec.ts`, `tests/security/no-express-api-under-fastify.spec.ts` (guarda estatica);
- testes ajustados: `finance/platform-revenue-report.spec.ts` (o teste com `res` falso estilo Express virou Nest+Fastify real com `inject()`), `tests/security/pdf-endpoint-authorization.spec.ts` (string `response.header`).

## Correcao (resumo)
- Upload: `readMultipartUpload(req, {maxBytes})` (suporte 20 MB, atestado 10 MB); sem `FileInterceptor`.
- Download: `reply.header(...)` + `reply.send(stream)` com `contentDisposition()`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.
- Antivirus fail-closed: download so com `CLEAN`; `QUARANTINED`/`SCANNING` -> 409; `REJECTED`/status desconhecido -> 403; `DELETED` -> 404. Autorizacao do chamado antes do status. Scanner indisponivel, erro de scan e `isInfected` nulo mantem a quarentena (reconecta ao clamd a cada tentativa); infectado -> `REJECTED` e arquivo apagado.
- Envio: `inspectFile` (magic bytes, PDF com JavaScript ativo recusado, tamanho). Extensao, nome e mimetype gravados vem do tipo real detectado, nao do declarado.

## Comandos e saida real
Antes da correcao (mesmos testes contra o codigo original):
- `npx vitest run .../support-attachments.http.spec.ts`: **6 falharam (todos 500)**.
- `hub-attachments.http.spec.ts` + `punch-receipt.http.spec.ts`: **7 falharam (500; `req.on is not a function`, `res.set is not a function`, `dest.on is not a function`)**.
- `platform-revenue-report.spec.ts` (CSV real): 1 falhou, `TypeError: res.setHeader is not a function`; `vacation-receipt.http.spec.ts`: 1 falhou (500).
- `support-attachments-antivirus.spec.ts`: 10 de 14 falharam (QUARANTINED/SCANNING/REJECTED/DELETED/desconhecido entregues ou 400, `isInfected` nulo virava CLEAN, tipo/mimetype declarados).
- `tests/security/no-express-api-under-fastify.spec.ts` contra o codigo original: 6 de 8 falharam.

Depois:
- `npx vitest run apps/api/src/modules/support apps/api/src/modules/schedule-hub apps/api/src/modules/time-track tests/security apps/api/src/modules/finance apps/api/src/modules/vacations`: **79 arquivos passaram, 630 testes passaram + 3 expected fail** (execucao final, com os commits de outros agentes ja integrados).
- `npx vitest run apps/api/src/modules/support apps/api/src/modules/schedule-hub apps/api/src/modules/time-track tests/security`: 40 arquivos, **314 passaram, 3 expected fail**.
- `npx tsc --noEmit -p apps/api`: sem erros.

## Criterios de aceite
| Criterio | Resultado |
|---|---|
| Upload de PDF pequeno -> 201 | OK (suporte e escala) |
| Tipo invalido -> 400 (padrao do projeto: 400; `.exe`, MZ disfarcado, PDF com JS) | OK |
| Arquivo grande -> 413 (suporte 20 MB, escala 10 MB) | OK |
| Download limpo -> 200 com Content-Disposition seguro (sem CR/LF, injecao de cabecalho testada) | OK |
| Pendente/quarentena -> 409; rejeitado/desconhecido -> 403 | OK |
| PDF do recibo de ponto -> 200 `application/pdf` | OK |

## Riscos que sobram
- Anexo que ficou em quarentena por clamd fora do ar nao e re-escaneado automaticamente (so quando outro upload dispara novo scan); falta job de reprocessamento.
- Upload e lido em memoria (ate 20 MB); sem streaming para disco.
- Bytes de `mp4`/`webm`/`txt` sao reconhecidos pelo `inspectFile`, mas nao ha CDR/sanitizacao de midia.
- O limite global do `@fastify/multipart` (main.ts, 10 MB) e o do suporte (20 MB, por requisicao) sao independentes; confirmar em producao que o proxy aceita 20 MB.
- `support-file-validation.service.ts` ficou sem uso (duplicado do `inspectFile`).
- Paginas NestJS e OWASP nao foram lidas (rede bloqueada): regras OWASP marcadas NAO VERIFICADO.
- Outros `@Res() res: any` que chamam `res.*` dentro de services (`time-closing`, `management-documents`) usam `res.raw ?? res` e nao foram reproduzidos em teste Fastify real.
