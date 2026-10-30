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
