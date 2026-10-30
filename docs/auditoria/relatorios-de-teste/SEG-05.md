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
