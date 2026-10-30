# RS-D-07 e RS-C-05: e-mail na conferencia, lembretes D-3/D-1 e reemissao de link

## Problema
- `review` aprovava/devolvia sem avisar o candidato; nao existia cron de documentos; reemitir era revogar e criar de novo sem encadear.
- Antes: os metodos `sendLinkReminders`, `reissueRequest` e os e-mails nao existiam (teste novo nao compilaria/passaria).

## Documentacao
- `@nestjs/schedule` `@Cron(expr, { timeZone })` e `@CronLock` (padrao do projeto, `common/redis/cron-lock.decorator.ts`): VERIFICADO no codigo.
- LGPD art. 6 (finalidade/necessidade) e art. 9 (transparencia): e-mail traz so rotulo do documento, motivo e link; nunca o conteudo. VIA BUSCA; validacao juridica do texto dos e-mails e do usuario.

## Decisoes
- O token e so hash no banco; portanto lembrete e devolucao **emitem um link novo** (`reissuedFromId` encadeia). O link novo da devolucao nao revoga o antigo (o candidato pode ter varios e-mails); a reemissao manual pelo RH (`POST /jobs/document-requests/:id/reissue`) revoga o antigo e mantem todos os documentos enviados.
- Lembrete: 1 por candidatura (link mais recente), so quando ha pendencia do candidato (sem envio ou devolvido; "recebido" aguarda o RH e nao e lembrado), D-3 e D-1 uma vez cada (reivindicacao atomica por `updateMany`, seguro com varias instancias). O RH recebe aviso (sino + e-mail) via `RecruiterNotifierService`.
- Cron `20 9 * * *` America/Sao_Paulo com `@CronLock('recruitment.documents-daily')`.

## Arquivos
`recruitment-documents.service.ts` (review, notifyCandidateOfReview, issueRequest, reissueRequest, sendLinkReminders), `recruitment-documents.mails.ts`, `recruitment-documents.cron.ts`, controller/DTO (`ReissueDocumentRequestDto`, `review` agora responde 200), `jobs.module.ts`, web `candidate-documents.tsx`/`jobs-api.ts`/`documents-model.ts`. Testes: `recruitment-documents-lifecycle.spec.ts` (12 testes) e ajuste de `recruitment-documents.service.spec.ts`.

## Comandos e saida real
```
npx vitest run apps/api/src/modules/jobs tests/contract -> Test Files 60 passed, Tests 486 passed
npx tsc --noEmit -p apps/api -> sem erros ; npm run typecheck:web -> sem erros ; lint:web -> 0 errors
```

## Riscos
- Sem `APP_URL` o e-mail de devolucao sai sem link (o motivo segue). Sem provedor de e-mail, `emailed:false` e aviso ao RH diz que o lembrete nao saiu.
