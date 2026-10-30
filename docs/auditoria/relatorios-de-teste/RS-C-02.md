# RS-C-02: Turnstile fail-open sem chave em producao

## Problema
Sem `TURNSTILE_SECRET_KEY` o `TurnstileGuard` libera tudo (candidatura, cadastro, login, pedido LGPD) e nada avisava, nem no boot.

## Documentacao
- Cloudflare Turnstile, validacao server-side (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/): o token so e valido se o siteverify responder `success:true`; sem segredo nao ha validacao. VIA BUSCA (regra ja refletida em `turnstile.service.ts`/`docs/TURNSTILE.md`).
- Decisao do pacote: nao quebrar quem ainda nao configurou; quebrar o boot apenas com `TURNSTILE_ENFORCE=true` e sem chave.

## Arquivos
- `apps/api/src/config/env.validation.ts` (`turnstileBootStatus`, problema em `productionEnvProblems`, alarme em `validateEnv`)
- `apps/api/src/config/turnstile-boot.spec.ts` (novo, 6 testes)

## Antes x depois
- Antes: 3 dos 6 testes novos falhavam (`turnstileBootStatus` inexistente, ENFORCE sem chave passava).
- Depois: `npx vitest run --config vitest.config.ts apps/api/src/config` = 2 arquivos, 13 testes passando.
- Producao com `TURNSTILE_ENFORCE=true` e sem chave: o boot falha com `TURNSTILE_SECRET_KEY is required when TURNSTILE_ENFORCE=true`.
- Producao sem chave e sem ENFORCE: continua subindo, com log `ERROR [Config] ALARME: ...`.
- Producao com chave sem ENFORCE: log de aviso (modo aberto se a Cloudflare falhar).

## Pendencia (outro pacote)
A "tela do DEV" (`/dashboard/platform/sistema`) pertence ao pacote de plataforma. A funcao `turnstileBootStatus(process.env)` ja devolve `{level, enabled, enforce, message}` sem segredo, pronta para ser exibida la.

## Riscos
Nenhuma variavel nova (usa `TURNSTILE_ENFORCE`, ja repassada no compose).
