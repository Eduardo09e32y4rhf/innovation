# SEG-10 — Turnstile fail-open configuravel

## Problema
HTTP 5xx, timeout/rede e segredo invalido deixavam passar sem alerta forte. Antes: `turnstile-policy.spec.ts` com 4 falhas de 5 (`turnstileFailMode` inexistente; sem 503; sem alerta de erro).

## Documentacao
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ — VIA BUSCA: siteverify exige o secret ligado ao sitekey; token vale 300 s e e de uso unico (`timeout-or-duplicate`); retries exigem `idempotency_key`. Que `invalid-input-secret` seja erro de configuracao e `internal-error` falha da Cloudflare: fonte secundaria (NAO VERIFICADO na pagina oficial). Nao implementei retry com idempotency_key.

## Correcao
`common/turnstile/turnstile.service.ts`: `turnstileFailMode()` (`TURNSTILE_FAIL_MODE=open|closed`; padrao `closed` so com NODE_ENV=production + chave + `TURNSTILE_ENFORCE=true`, senao `open`). Em `closed`: 503 claro; em `open`: segue com log de erro. `docs/TURNSTILE.md` atualizado.

## Testes
`npx vitest run apps/api/src/common/turnstile`: 13 passando (5 novos; 8 antigos intactos). `npx tsc --noEmit -p apps/api` sem erros.

## Nao feito / riscos
- "Producao sem chave nao sobe" (D7=B) e limite apertado de IP quando a Cloudflare cai: nao implementados (mudam o boot de producao; decisao do usuario). O limite por IP geral (SEG-05) ja cobre as rotas.
- Turnstile em `support/public/*`: nao adicionado, pois o formulario publico de suporte do site nao envia token (arquivo web fora do meu escopo) e quebraria o envio com a chave ligada. Continua honeypot + 5/min por IP.
- Repasse das variaveis novas no compose/.env.example/env.validation: pendente (infra).

## Parte API de support/public (onda 1, grupo A)
Problema: `/support/public/tickets` e `/support/public/password-reset` so tinham honeypot + 5/min por IP. Teste novo `common/turnstile/turnstile-optional.guard.spec.ts` falhou 5/5 antes (guard inexistente).
Documentacao: a mesma de SEG-10 acima (siteverify; VIA BUSCA / NAO VERIFICADO na pagina oficial).
Correcao: `TurnstileOptionalGuard` (em `turnstile.guard.ts`, exportado pelo `TurnstileModule`) aplicado ao `PublicSupportController`: com `TURNSTILE_SECRET_KEY` ligado, se o token vier (header `x-turnstile-token` ou corpo `turnstileToken`) ele e VALIDADO (invalido = 400; Cloudflare fora segue a politica `TURNSTILE_FAIL_MODE` do servico); sem token PASSA (o formulario atual do site nao o envia). `TURNSTILE_PUBLIC_SUPPORT_REQUIRED=true` passa a exigir o token. `CreatePublicSupportTicketDto` aceita `turnstileToken` opcional (o do password-reset ja aceitava).
Mudanca de front necessaria (NAO feita; apps/web e de outro agente): o widget Turnstile do formulario publico de suporte (tela de login) deve enviar `x-turnstile-token`. Depois disso, ligar `TURNSTILE_PUBLIC_SUPPORT_REQUIRED=true` (com `TURNSTILE_FAIL_MODE=closed`) nos envs de producao. A variavel nova ainda nao esta em compose/.env.example/env.validation (infra).
Testes: `npx vitest run apps/api/src/common/turnstile apps/api/src/modules/support tests/contract`: 38 arquivos, 327 testes passaram. `npx tsc --noEmit -p apps/api`: sem erros.
