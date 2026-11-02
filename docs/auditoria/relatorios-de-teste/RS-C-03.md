# RS-C-03 + RS-D-13: curriculo sem antivirus (candidatura publica e conta)

## Problema
`CandidateDocumentScanner` (ClamAV) so era usado nos documentos admissionais. `JobsService.apply` e `CandidateAccountService.saveResume` gravavam o curriculo so com validacao de tipo/tamanho.

## Documentacao
- ClamAV `clamd` (INSTREAM) via pacote `clamscan` ja usado no projeto; regra de projeto: em producao, scanner indisponivel BLOQUEIA (fail-closed). VERIFICADO no codigo (`candidate-document-scanner.service.ts`).
- OWASP File Upload Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): recomenda antivirus/sandbox no arquivo enviado. NAO VERIFICADO por fetch (so referencia).

## Arquivos
- `candidate-document-scanner.service.ts`: nova funcao `assertResumeClean(scanner, buffer)` (sem scanner injetado em producao = 503).
- `jobs.service.ts` (`apply`) e `candidate-account.service.ts` (`saveResume`): chamam o scan depois de `inspectFile` e antes de gravar no storage/banco.
- `resume-antivirus.spec.ts` (novo, 5 testes).

## Antes x depois
- Antes: 3 de 4 testes novos falhavam (nada chamava o scanner).
- Depois: `npx vitest run --config vitest.config.ts apps/api/src/modules/jobs` = 28 arquivos, 224 testes passando.
- Infectado: 422; scanner fora do ar em producao: 503; nada e gravado em nenhum dos casos.
- Candidatura "reutilizar perfil" passa pelo mesmo `JobsService.apply`, entao tambem e verificada.

## Riscos
Em producao sem ClamAV acessivel (`CLAMAV_HOST`/`CLAMAV_PORT`) a candidatura e o upload de curriculo passam a responder 503. O compose de producao ja sobe o ClamAV para os documentos admissionais; conferir.
