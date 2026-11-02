# RS-C-01: pedido LGPD do candidato com confirmacao do titular

## Problema
`POST /public/candidate-requests` abria `CandidateRequest` para qualquer e-mail digitado, sem Turnstile; e `answerRequest` apagava os dados por padrao (`perform !== false`). Terceiros podiam provocar a exclusao dos dados reais de outra pessoa.

## Documentacao
- LGPD (Lei 13.709/2018) art. 18 (direitos do titular: confirmacao, acesso, correcao, eliminacao...) e art. 19, II (resposta completa em ate 15 dias): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. **NAO VERIFICADO**: o host planalto.gov.br nao resolve neste ambiente (precisa ser liberado na rede da sessao). Regras citadas de memoria; **validacao juridica pendente do usuario/advogado**, inclusive se a verificacao por e-mail basta como autenticacao do titular e quais dados devem ser preservados (ex.: obrigacao legal, art. 16).
- Cloudflare Turnstile: guard ja existente (`TurnstileGuard`).

## O que mudou
- Passo 1 (`POST /public/candidate-requests`, Turnstile, 200): se o e-mail existe na base envia link (2 h, uso unico, token 32 bytes, so o SHA-256 gravado em `CandidateRequestVerification`); max. 3 por e-mail/hora; resposta sempre `{received:true}`.
- Passo 2 (`POST /public/candidate-requests/confirm`): so entao abre um `CandidateRequest` por empresa, com `confirmedAt` e `dueAt` = +15 dias.
- Exclusao: `perform` e obrigatorio e booleano. `true` executa; `false` nega. Ambos gravam `decision` e `AuditLog` (`LGPD_DELETION_EXECUTED` / `LGPD_DELETION_DENIED`). Sem `perform` = 400.
- Web: formulario com `TurnstileWidget` e texto do prazo; nova pagina `/carreiras/privacidade/confirmar?token=` (clique explicito); tela do RH mostra prazo e botoes "Excluir dados e responder" / "Negar exclusao".
- Migration `20261101010000_rs_c01_lgpd_request_verification` (idempotente) + `schema.prisma`.

## Arquivos
`recruitment-privacy.service.ts`, `recruitment-privacy.controller.ts`, `recruitment-mails.ts`, `prisma/schema.prisma`, migration, `lgpd-request.spec.ts` (9 testes), `tests/contract/controllers-guards.spec.ts` (rota publica declarada), web: `privacidade/request-form.tsx`, `privacidade/confirmar/*`, `_lib/public-jobs.ts`, `lib/turnstile.ts`, `[tenant]/dashboard/jobs/_components/privacy-settings.tsx`, `privacy-api.ts`.

## Antes x depois
- Antes: pedido sem verificacao; exclusao por padrao.
- Depois: `vitest run tests/contract apps/api/src/modules/jobs` = tudo verde (contract 31 arquivos / 246 testes; jobs 30 arquivos); `tsc --noEmit -p apps/api` limpo; `typecheck:web` limpo; `lint:web` 0 erros.

## Riscos / pendencias
- Pedidos ja abertos antes da migracao ficam sem `dueAt`/`confirmedAt` (aparecem sem prazo).
- Sem tela de "fila de vencidos" (so mostra o prazo na linha).
- Prova de migration em Postgres limpo: ver status do pacote.
