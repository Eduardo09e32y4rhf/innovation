# SEG-05 — Limite de requisicoes por IP, storage compartilhado

## Problema
Throttler em memoria e sem IP: trocar o e-mail/CPF a cada tentativa criava balde novo; webhooks com `@SkipThrottle` ilimitados.
Antes da correcao `apps/api/src/common/guards/throttler-ip.spec.ts`: 3 falhas de 5 (6a tentativa com e-mails distintos = 201, CPF distinto = 201, webhook 601 = 201).

## Documentacao
- https://docs.nestjs.com/security/rate-limiting — VIA BUSCA (host bloqueado): varios throttlers nomeados em `throttlers`, `@Throttle({nome:{limit,ttl}})`, storage externo, tracker customizado, atras de proxy habilitar trust proxy do adaptador. Storage Redis oficial: NAO VERIFICADO (nao achei no texto oficial); implementei storage proprio (interface `ThrottlerStorage.increment`, lida em `node_modules/@nestjs/throttler`, v6.5.0). Nao mexi em package.json.
- OWASP Authentication Cheat Sheet (limitar por conta e por IP): NAO VERIFICADO (bloqueado).

## Correcao
- `common/guards/throttler.config.ts`: dois limitadores: `default` (conta/identificador/token; limites do `@Throttle` da rota) e `ip` (chave `ip:<req.ip>`, mesma rota; limite = limite do `@Throttle` da rota x `THROTTLE_IP_FACTOR` (padrao 1), ou 300/min sem decorator). `ip` NAO vale para rotas com `JwtAuthGuard` (NAT de empresa). Webhooks (`/webhook(s)/`): `default` ignorado, `ip` 600/min.
- `common/redis/redis-throttler.storage.ts`: contador atomico (Lua) no Redis, com bloqueio; sem Redis cai para memoria (nunca sem limite).
- `app.module.ts`: `ThrottlerModule.forRootAsync` com esse storage. `user-throttler.guard.ts`: so comentario.
- Rotas de auth, `support/public/*` (5/min) e candidatura ja tinham `@Throttle`; o `ip` agora as cobre por IP. Conferido: nenhuma rota publica de auth/support ficou sem decorator.

## Testes
`npx vitest run apps/api/src/common/guards apps/api/src/common/redis`: 8 arquivos, 59 testes passando, incl. 6 do throttler-ip (storage Redis real via redis-server efemero, reinicio da API e queda do Redis). `npx tsc --noEmit -p apps/api`: sem erros.

## Riscos que sobram
IP compartilhado (NAT) em login/cadastro/reset: ajustar `THROTTLE_IP_FACTOR`. Depende de `TRUST_PROXY` correto (INF-01). As "10 rotas sensiveis" de checkout/reset de MFA/aceite de termo ficam em modulos de outros grupos (finance/users): nao alteradas; ficam cobertas apenas pelo global 300/min (e por conta, se autenticadas).

## Restante (onda 1, grupo A): as rotas sensiveis sem limite proprio
Problema: `apps/api/src/common/guards/throttle-sensitive-routes.spec.ts` (novo) falhou 15/15 antes (13 rotas sem `@Throttle` e dois testes de 429 que nao disparavam).
Documentacao: https://docs.nestjs.com/security/rate-limiting (`@Throttle({ default: { limit, ttl } })` por rota) — VIA BUSCA (host bloqueado), mesma fonte do restante deste relatorio. Valores sao decisao de calibragem, nao regra de documento.
Correcao: `@Throttle` (por minuto, rotas autenticadas: chave do limitador `default` = token do usuario, `ip` nao se aplica a rotas com JwtAuthGuard):
- reset de senha: `POST /users/:id/reset-password` 10, `POST /auth/password-reset/employee` 10 (RH/ADMIN)
- reset de MFA: `POST /users/:id/mfa/reset` 10
- aceite de termos: `POST /legal/terms/accept` 20
- anexo de suporte: `POST /support/tickets/:id/attachments` 20
- consultas externas: `GET /lookup/cep/:cep`, `GET /lookup/cnpj/:cnpj`, `GET /platform/receita/:cnpj`, `GET /candidate-portal/cep/:cep` 30 (o do candidato tambem tem o limite por IP)
- checkout: `POST /finance/company/checkout`, `POST /faturas/empresa/checkout`, `POST /finance/platform/companies/:id/checkout` 10; `POST /finance/platform/webhook-events/:id/retry` 10 (so decorators; sem tocar na logica de dinheiro).
Teste: tabela metadata x limite (13) + Nest/Fastify com ThrottlerModule real: reset de MFA 11a chamada = 429, aceite de termos 21a = 429.
Testes: `npx vitest run apps/api/src/common/guards tests/contract apps/api/src/modules/{users,lookup,finance,support,platform}`: 87 arquivos, 710 testes passaram. `npx tsc --noEmit -p apps/api`: sem erros.
Risco: usuario legitimo que consulte CEP/CNPJ em lote (>30/min) recebe 429; ajustar o numero na rota.
