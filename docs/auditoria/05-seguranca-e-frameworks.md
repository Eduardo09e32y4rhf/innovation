# 05 - Seguranca e uso dos frameworks (auditoria somente leitura)

Data: 2026-10-29. Escopo: `apps/api` (NestJS 11 + Fastify 5.12 + Prisma 6), `apps/web` (Next 14), `infra/`, `scripts/deploy`.
Nenhum codigo foi alterado. Nenhum segredo foi lido ou impresso.

## 0. Como ler e o que NAO foi possivel verificar

- **Documentacao oficial**: os hosts `docs.nestjs.com`, `fastify.dev` e `cheatsheetseries.owasp.org` estao fora da rede permitida da sessao (WebFetch falhou com ENOTFOUND). As regras abaixo foram confirmadas por **WebSearch** (trechos e titulos dos resultados), sem abrir a pagina inteira. A URL citada e a pagina oficial; onde a confirmacao veio so de resumo de busca, esta marcado "(via busca)". Para fechar 100%, libere esses dominios e reabra as URLs.
- **Evidencia propria** (mais forte que citacao): (a) reproduzi em um app Nest+Fastify minimo o comportamento de `FileInterceptor` e `res.set` (ver A1); (b) subi um Postgres 16 descartavel, apliquei todas as 42 migrations e rodei `prisma migrate diff` contra o `schema.prisma` (ver secao 3). O cluster temporario foi removido.
- **Nao verificado**: o nginx REAL do host (so ha exemplos em `infra/`); o banco de producao (drift real); `npm audit` (sem rede); valores reais do `.env` de producao; mecanismo de criptografia de disco/backup; comportamento de ClamAV em runtime; testes de carga.

## 1. Resumo

| Gravidade | Qtde |
|---|---|
| Critica | 0 |
| Alta | 5 |
| Media | 8 |
| Baixa | 15 |

### Os 10 achados mais importantes
1. **A1 (alta)** Upload de anexo de suporte, anexo de lancamento da escala, download de anexo de suporte e PDF de recibo de ponto usam APIs do Express (`FileInterceptor`, `res.set`, `stream.pipe(res)`) sob `FastifyAdapter`: respondem 500. Reproduzido.
2. **A2 (alta)** Anexos de suporte: o scan ClamAV e assincrono e **fail-open**; arquivo em `QUARANTINED` (ou com scan falho) e baixavel (so `REJECTED` e bloqueado).
3. **A3 (alta)** Nenhum dado pessoal sensivel e criptografado em repouso: `CryptoService` nao tem consumidor; `KMS_MASTER_KEY` so protege segredo MFA e senha provisoria. CPF/RG em texto puro.
4. **A4 (alta)** Tabelas globais de regras de folha (INSS/IRRF/FGTS/parametros CLT) podem ser criadas e desativadas por qualquer usuario `CONTABIL` de qualquer escritorio: impacto em todos os tenants.
5. **A5 (alta)** `purgeCompany` apaga definitivamente faturas, tickets e audit logs; `deleteWithHistory` apaga ponto e folha em cascata: conflito com retencao legal.
6. **M1 (media)** Rate limit de login so por e-mail (sem limite por IP) e `ThrottlerModule` em memoria: password spraying e reset a cada restart/instancia; Turnstile e opcional.
7. **M2 (media)** `RateLimitGuard` (ponto) usa `X-Forwarded-For`/`CF-Connecting-IP`/`X-Real-IP` enviados pelo cliente na chave: contornavel.
8. **M3 (media)** Web sem CSP/XFO/nosniff/Referrer-Policy/HSTS (nem em `next.config.js` nem nos nginx do repo); helmet cobre so as respostas da API.
9. **M4 (media)** `JwtAuthGuard` e opt-in por controller (nao e `APP_GUARD`) e `RolesGuard` sem `@Roles` libera tudo: esquecer um decorator = rota aberta/ampla.
10. **M5 (media)** Codigo de recuperacao de senha de 6 hex (24 bits), guardado em texto puro no banco e em `Notification.extraJson`.

## 2. NestJS + Fastify (item 1)

### Correto
- **trustProxy**: `trustProxy: process.env.TRUST_PROXY ?? 'loopback,uniquelocal'` (`apps/api/src/main.ts:49`), lista de IP/CIDR e nao `true` nem numero. Regra: Fastify aceita booleano, IP/CIDR, funcao ou contagem de saltos; avisos recentes (CVE-2026-16732, forma numerica) e a recomendacao de IP/CIDR/funcao (via busca) - https://fastify.dev/docs/latest/Reference/Server/#trustproxy ; Nest: https://docs.nestjs.com/security/rate-limiting (secao proxies, via busca). O nginx usa `X-Forwarded-For $proxy_add_x_forwarded_for` (`infra/nginx-lb.conf:41`): o valor do cliente fica a esquerda e o IP real e anexado a direita; o Fastify le da direita pulando proxies confiaveis, entao o IP forjado nao vence. As portas da API/Web estao em `127.0.0.1` (`docker-compose.prod.yml:129,167`). `getRequestMeta` e `UserThrottlerGuard.clientIp` usam `req.ip`.
- **helmet**: `@fastify/helmet` registrado; CSP so em producao (`main.ts:63-79`). Aceitavel para API JSON. (Obs.: `scriptSrc 'unsafe-inline'` e desnecessario numa API; baixo risco.)
- **CORS**: `ALLOWED_ORIGINS` obrigatorio em producao (`config/env.validation.ts:19`), lista explicita, `credentials:true`, em producao sem lista = `false` (`main.ts:82-91`). WebSocket usa o mesmo criterio. Doc: https://docs.nestjs.com/security/cors (via busca).
- **Cookie**: `irh_rt` com `httpOnly`, `secure` em producao, `sameSite:'lax'`, `path:'/'` (`auth.controller.ts:221-224`); refresh so no cookie, nunca no corpo. Doc: https://owasp.org/www-community/controls/SecureCookieAttribute e https://github.com/fastify/fastify-cookie. `Lax` + POST + CORS restrito cobre CSRF para `/auth/refresh` e `/auth/logout`.
- **Limite de corpo**: 1 MiB padrao, excecoes por rota via hook `onRoute` (`common/http/body-limits.ts`); `@fastify/multipart` 10 MB. Doc: https://fastify.dev/docs/latest/Reference/Server/#bodylimit (default 1 MiB).
- **ValidationPipe**: `whitelist`, `forbidNonWhitelisted`, `transform` (`main.ts:94-101`). Doc: https://docs.nestjs.com/techniques/validation.
- **Filtro de excecoes**: `@Catch()` global; 500 devolve so mensagem generica + `requestId`; stack vai so para o log; erros Prisma mapeados (P2002 -> 409 etc.); `common/filters/http-exception.filter.ts`. Doc: https://docs.nestjs.com/exception-filters.
- **Graceful shutdown**: `enableShutdownHooks()` + `PrismaService.onModuleDestroy`. Doc: https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown.
- **Health**: `/health/live` (sem dependencias), `/health/ready` (so DB, com timeout de 2 s), healthcheck do compose usa `/health/live`. Swagger desligado em producao; `/metrics` exige `METRICS_TOKEN` (comparacao `timingSafeEqual`).
- **Webhooks** Asaas e Mercado Pago validam token/assinatura em tempo constante.

### Achados

**A1 - alta - Express API sob Fastify (causa-raiz de 500 em upload/download)**
- Regra: o suporte de upload embutido do Nest e baseado em `multer` e e do `platform-express`; nao funciona com `FastifyAdapter` (usar `@fastify/multipart`). https://docs.nestjs.com/techniques/file-upload (via busca: "este pacote nao e compativel com FastifyAdapter"); adaptador: https://docs.nestjs.com/techniques/performance.
- Codigo: `support/support.controller.ts:88` (`FileInterceptor('file')` + `@UploadedFile`), `schedule-hub/hub.controller.ts:152` (idem, `launch/attachment`), `support/support.controller.ts:107-112` (`res.set(...)` + `stream.pipe(res)` com tipo `Response` do express), `schedule-hub/punch/punch.controller.ts:27` (`res.set(...)`; `res.end`). Ja `employees-import.controller.ts:58` usa `req.file()` (correto) e `hub.controller.ts:162` usa `reply.header` (mas `stream.pipe(reply)` tambem e invalido: o correto e `reply.send(stream)`).
- Reproducao (scratchpad, Nest 11 + Fastify 5.12 + as mesmas versoes): upload multipart -> `500 TypeError: req.on is not a function`; GET com `res.set` -> `500 TypeError: res.set is not a function`.
- Correcao: trocar por `req.file()` do `@fastify/multipart` (ja registrado) e `reply.header(...).send(stream)`; remover `multer`/`@nestjs/platform-express` quando nao restar uso; adicionar teste e2e real com `FastifyAdapter` (os unitarios com mock nao pegam isso).

**M1 - media - Throttler em memoria e limite so por e-mail**
- Regra: com varias instancias/reinicios usar armazenamento compartilhado (Redis) e rastrear o IP real; o tracker padrao e por IP. https://docs.nestjs.com/security/rate-limiting (via busca); OWASP Authentication CS: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (limitar por conta E por IP).
- Codigo: `app.module.ts:88` `ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }])` sem `storage`; `common/guards/user-throttler.guard.ts:14-20` devolve `email:<...>` do corpo quando existe; `auth.controller.ts:48-52` login 5/15 min. Sem IP no tracker, um IP pode tentar 1 senha em milhares de e-mails sem limite (o bloqueio de conta so conta falhas por usuario). `TurnstileGuard` so atua se `TURNSTILE_SECRET_KEY` estiver definido (`docs/TURNSTILE.md`). O contador de seguranca (`SecurityStore`) usa Redis, o Throttler nao.
- Correcao: `ThrottlerStorageRedisService` (ou storage proprio) + segundo throttler por IP (`ip:`) alem do por identidade; tornar Turnstile obrigatorio em producao para `login`/`register`/`password-reset`.

**M2 - media - `RateLimitGuard` confia em cabecalhos do cliente**
- Regra: cabecalhos `X-Forwarded-*` so valem pelos saltos confiaveis (Fastify `trustProxy`). https://fastify.dev/docs/latest/Reference/Server/#trustproxy.
- Codigo: `common/guards/rate-limit.guard.ts:73-84` (`cf-connecting-ip` > `x-real-ip` > `x-forwarded-for[0]` > `request.ip`); usado em `time-track.controller.ts` e `punch.controller.ts`. A chave inclui o IP, entao variar o cabecalho gera chave nova a cada pedido.
- Correcao: usar so `request.ip`.

**Baixas**
- B1: `/health` (completo) e publico e expoe uptime/memoria (`health.controller.ts:30-44`). Restringir ao nginx/rede interna ou remover campos.
- B2: `new FastifyAdapter({ logger: true })` ativa o pino do Fastify em paralelo ao winston: logs duplicados em formato diferente, sem redacao. Padronizar em um logger.
- B3: `PrismaService.onModuleInit` engole falha de `$connect` (so `warn`): a API sobe sem banco; coberto pelo `/health/ready`, mas nao pelo healthcheck do compose (usa `live`).
- B4: `enableShutdownHooks` sem `stop_grace_period`/`forceCloseConnections` documentados: downloads longos podem ser cortados no deploy.

## 3. Autenticacao e sessao (item 2)

### Correto (alto nivel de maturidade)
- **Refresh token**: opaco 48 bytes, so o SHA-256 no banco, cookie httpOnly, **rotacao** a cada uso dentro de transacao com compare-and-set (`session.service.ts:49-76`), **deteccao de reuso** revoga a familia inteira (`:42-47`), teto absoluto de 90 dias, expurgo diario. Regra: OWASP/RFC 6819 e RFC 9700 §4.14 (rotacao + deteccao de reuso); OWASP JWT CS https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html (via busca).
- **Access token**: curto no compose (`JWT_EXPIRES_IN:-15m`, `docker-compose.prod.yml:53`), guardado **so em memoria** no navegador (`web/app/lib/auth-session.ts:97-105` remove token do Web Storage), e `JwtAuthGuard` confere a cada pedido usuario ativo, empresa ativa, `passwordVersion` e sessao nao revogada no banco (`jwt-auth.guard.ts:33-65`): revogacao imediata sem Redis.
- **Tokens com finalidade** (`purpose`) para MFA, e-mail e reset; `assertAccessToken` impede usar token de reset como acesso.
- **MFA TOTP** (RFC 6238, via busca https://datatracker.ietf.org/doc/html/rfc6238): janela +/-1 passo, comparacao `timingSafeEqual`, **anti-replay** por passo (`claimOnce` no Redis, TTL 120 s - `mfa.service.ts:57-62`), falhas contam para o bloqueio progressivo, codigos de recuperacao de uso unico com compare-and-set, segredo cifrado AES-256-GCM, MFA obrigatorio para perfis de plataforma.
- **Recuperacao de senha**: resposta imediata e identica exista ou nao o e-mail (trabalho em segundo plano, `auth.service.ts:441-444`), mensagem unica em todas as falhas, token JWT de 30 min amarrado a `passwordChangedAt` (uso unico efetivo), revoga todas as sessoes e avisa por e-mail; login equaliza tempo com hash falso (`burnPasswordCheck`). Regra: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html (via busca).
- **Hash de senha**: bcrypt custo 12 (OWASP minimo 10 para legado; Argon2id e a 1a opcao: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html, via busca), historico de 10 senhas, expiracao 30 dias, senha provisoria com validade.
- `env.validation` em producao exige `JWT_SECRET` forte, `KMS_MASTER_KEY` de 64 hex diferente do JWT, senha de banco e Redis, tokens de webhook e metricas.

### Achados

**M5 - media - Codigo de reset fraco e em texto puro**
- Regra: tokens de reset devem ser de alta entropia, de uso unico, com expiracao curta e **armazenados com hash**. OWASP Forgot Password CS (acima).
- Codigo: `auth.service.ts:451-455` gera `randomBytes(4).toString('hex').slice(0,6)` (24 bits); `auth.repository.ts:308-312` grava `resetPasswordCode` em claro; tambem vai em claro em `Notification.extraJson` (`auth.service.ts:490`). Mitigacoes reais: 5 tentativas por e-mail e depois invalida (`failResetValidation`), validade 2 h, exige CPF parcial + matricula para funcionario. Vazamento de leitura do banco/notificacoes permite redefinir senha de qualquer usuario com codigo pendente.
- Correcao: guardar `sha256(code)`; mostrar o codigo so uma vez ao RH (sem persistir em `extraJson`); aumentar para 8+ caracteres.

**B5 - baixa - Algoritmo JWT nao fixado**
- Regra: o verificador deve fixar o algoritmo (RFC 8725 §3.1, via busca). Codigo: `jwt-auth.guard.ts:35`, `auth.module.ts:21-25` sem `algorithms`. Com segredo string o `jsonwebtoken` so aceita HS256/384/512 (nao aceita `none`), entao risco real baixo. Correcao: `signOptions.algorithm:'HS256'` e `verify {algorithms:['HS256']}`.

**B6 - baixa - Default de 7 dias fora do compose**
- `.env.example:27` e `config/app.config.ts:4` usam `7d`; so o compose forca 15m. Alinhar.

**B7 - baixa - Bloqueio por conta como vetor de DoS**
- 5 falhas bloqueiam e-mail alvo (`email:` no tracker). Compromisso conhecido; manter e-mail de alerta (ja existe).

**B8 - baixa - bcryptjs (JS puro) e tamanho de senha**
- bcryptjs ~3x mais lento que `bcrypt` nativo e ocupa o event loop em rajadas (defeito S-06 do QA). Sem `@MaxLength` visivel nos DTOs de senha (bcrypt trunca em 72 bytes). Migrar para Argon2id (OWASP) com rehash no login e limitar tamanho.

## 4. Prisma 6 e migracoes (item 3)

### Correto
- **SQL injection**: 13 usos de `$queryRaw/$executeRaw`, **todos como template tagged** (parametrizados); o unico `Prisma.raw` (`analytics.service.ts:106`) usa colunas filtradas por whitelist (`COLUMNS`). Nenhum `$queryRawUnsafe/$executeRawUnsafe`. Regra: https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries .
- Transacoes: 97 usos de `$transaction`; operacoes criticas usam `FOR UPDATE` e `pg_advisory_xact_lock` (refund, e-mail unico, plataforma-audit).
- **Drift (medido)**: apliquei as 42 migrations em ordem (baseline + demais, como em `apply-migrations.sh`) num Postgres 16 limpo, sem nenhuma falha, e executei `prisma migrate diff --from-url <banco> --to-schema-datamodel schema.prisma --script`: resultado **`-- This is an empty migration.`** = **zero drift** entre `schema.prisma` e o SQL das migrations. Doc: https://www.prisma.io/docs/orm/prisma-migrate/workflows/troubleshooting-development e https://docs.prisma.io/docs/cli/migrate/resolve (via busca).

### Achados

**M6 - media - Dois mecanismos de migracao e risco de drift em PRODUCAO (nao medivel daqui)**
- Regra: em producao usar `prisma migrate deploy`; `deploy` NAO detecta drift (precisa de shadow DB), por isso comparar com `migrate status`/`migrate diff` e baselining via `migrate resolve --applied`. https://www.prisma.io/docs/orm/prisma-migrate/workflows/production-troubleshooting e https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining (via busca).
- Codigo: `scripts/deploy/apply-migrations.sh` aplica SQL por `psql` e registra em `_manual_migrations` (nao `_prisma_migrations`), comecando em `MIGRATIONS_FROM=20261006100001`; `migrate-prisma.sh` existe mas nao e usado. O que o repo prova: um banco novo nasce identico ao schema. O que nao prova: que o banco de producao (historico pre-baseline aplicado "a mao") esteja igual.
- Riscos adicionais: duas migrations com o mesmo timestamp (`20261012170000_jobs_lifecycle_internal` e `20261012170000_timesheet_ack`, ordem so por nome); cada migration roda dentro de `BEGIN/COMMIT`, entao `CREATE INDEX CONCURRENTLY` falharia; `20261022190000_performance_indexes` bloqueia escrita em tabela grande; arquivos soltos `prisma/schema.diff.sql`, `schema.old.prisma`, `migrations_legacy/` confundem.
- Correcao: rodar em producao (somente leitura) `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel schema.prisma --script` e exigir vazio no CI de deploy; planejar o baseline e migrar para `migrate deploy`; renomear timestamp duplicado em migrations futuras; mover/remover arquivos legados.

**M7 - media - Cascades e hard delete**
- 118 `onDelete: Cascade` (apenas 4 `Restrict`). `Company -> Employee -> TimeTrack/Payroll/...` apaga historico trabalhista em cascata. `employees.repository.ts:319-323 deleteWithHistory` e `platform.repository.ts:380-389 purgeCompany` (apaga `platformInvoice`, `auditLog`, `supportTicket`, `user`, empresa). Sem extensao Prisma de soft delete: `deletedAt` existe em ~10 modelos mas cada query precisa lembrar `deletedAt: null`.
- Regra: LGPD art. 16 I (conservacao por obrigacao legal) https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm ; ponto/folha/fiscal tem prazos legais.
- Correcao: `purgeCompany` exigir exportacao + janela de retencao e nunca apagar `auditLog`/faturas fiscais; trocar cascades de dados legais por `Restrict`; usar extensao Prisma para filtrar `deletedAt`.

**B9 - baixa - Pool e N+1**
- Sem `connection_limit`/`pool_timeout` na `DATABASE_URL` (`docker-compose.prod.yml:50`): padrao Prisma = `num_cpus*2+1` com `mem_limit` 1 g. Ajustar e monitorar `P2024`. 169 `include:` espalhados; sem revisao de N+1 sistematica (amostra nao mostrou loop com query dentro, mas nao foi exaustiva).

## 5. Multi-tenant e autorizacao (item 4)

Amostrei ~45 pontos Prisma (`findUnique/findFirst/update/delete` por `id`) em jobs, schedule-hub, time-track, payroll, accounting, finance, support, documents, management, privacy, commercial, ai.

- **IDOR confirmado: 0.** Padrao dominante e correto: `findFirst({where:{id, companyId}})` e so depois `update/delete({where:{id}})` (ex.: `document-templates.controller.ts:44-47`, `time-closing.service.ts:536-540`, `overrides.service.ts:62-64`, `work-schedule-rules.service.ts:27-35`, `management-events.service.ts:119-123`). `assertEmployee` valida escopo + empresa (`schedule-scope.service.ts:41-48`). `TenantGuard` define `request.companyId` e bloqueia empresa suspensa; `companyId` vem do token/usuario do banco (modo fantasma so por token assinado).
- **B10 - baixa - Defesa em profundidade**: ~25 `update/delete({where:{id}})` dependem de verificacao anterior (corrida/regressao futura): `payroll.service.ts:297-327`, `accounting-office.service.ts:303,340` (valida por escritorio contabil), `time-closing.service.ts:540,818`, `document-templates.controller.ts:47`, `work-schedule-rules.service.ts:30,35`. Preferir `updateMany/deleteMany({where:{id,companyId}})` e checar `count`.
- **Fora de padrao, cobertos por papel**: `ai.controller.ts:106,121` (`supportTicket` sem empresa, mas so `DEV`); `platform/*`, `coupons`, `commercial-sales` (so DEV/CEO).
- **A4 - alta - Regras globais de folha editaveis por CONTABIL**: `accounting.controller.ts:19` `@Roles('DEV','CEO','CONTABIL')` + `rules` (`:68-83`) e `accounting-rules.service.ts` `saveVersion/deactivate` operam em `payrollTaxTable` **sem empresa** (tabela global). Um usuario de qualquer escritorio contabil altera INSS/IRRF/FGTS/parametros de TODOS os clientes da plataforma. Correcao: restringir escrita a `DEV`/`CEO` (ou aprovar em duas etapas) e manter `CONTABIL` so leitura.
- **M4 - media - Guards opt-in**: `APP_GUARD` global so tem FeatureFlag, Throttler, MfaEnrollment, Tenant, Subscription (`app.module.ts:134-140`); `JwtAuthGuard` e `RolesGuard` ficam em cada controller. Verifiquei os ~50 controllers: so os publicos esperados nao usam `JwtAuthGuard` (health, metrics, 2 webhooks, candidate-account, public-jobs, public-candidate-documents, public-support). Porem `RolesGuard` devolve `true` quando nao ha `@Roles` (`roles.guard.ts:17`): metodo sem decorator vira "qualquer logado". Correcao: guard global JWT com `@Public()` explicito e `RolesGuard` fail-closed (ou teste que lista rotas sem `@Roles`).
- **B11 - baixa**: `communication.gateway.ts` (`/communication`) nao autentica nem faz `join` de sala: hoje nao entrega nada (eventos `to(companyId)` sem ouvintes), mas se alguem adicionar `join` sem auth vaza entre tenants.
- `document.service.ts:80-90` deixa `DEV`/`SUPORTE` baixarem PDF de qualquer empresa (intencional, auditar) e erra com 400 em vez de 404/403.

## 6. Uploads e PDFs (item 5)

### Correto
- `common/utils/file-validation.ts` valida pelo **conteudo** (magic bytes no offset 0, estrutura ZIP/OOXML, anti zip-bomb: 1000 entradas, 64 MB, razao 100, PDF com JS/Launch rejeitado, nome sanitizado, extensao decidida pelo tipo detectado). Regra: OWASP File Upload CS https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html (via busca).
- `CandidateDocumentScanner`: **fail-closed** em producao (503 se ClamAV indisponivel ou falhar) - `jobs/candidate-document-scanner.service.ts:36-52`.
- `Content-Disposition` sempre por `contentDisposition()` (remove CR/LF/aspas, `filename*` RFC 5987 - `common/pdf/pdf-response.ts:5-9`); helmet envia `nosniff`.
- Path traversal: chaves de storage sao geradas no servidor (`<ticketId>/<timestamp>-<sha>.<ext>`, `docs/<companyId>/...`); `ticketId` vem de rota. Ver B12.

### Achados
**A2 - alta - Anexos de suporte: scan assincrono fail-open** (`support-attachment.service.ts`)
- Codigo: grava arquivo, status `QUARANTINED`, dispara `scanAttachment` sem aguardar (`:100`); se `this.clamscan` nao iniciou (`:30-45`) ou o scan falha (`:117-119`) o status fica `QUARANTINED` para sempre; mas `downloadAttachment` so bloqueia `REJECTED` (`:131-133`). O log diz "attachments will stay quarantined" - nao e verdade para o download. Contraste com o scanner de candidatos, que e fail-closed. (Hoje inalcancavel por A1, mas ativa ao corrigir A1.)
- Correcao: bloquear download se `status !== 'CLEAN'`; em producao exigir scanner no upload (reutilizar `CandidateDocumentScanner.assertClean`).

**B12 - baixa - Hardening de storage**: `local-support-storage.service.ts` usa `path.join(base, key)` sem checar que o resultado fica dentro de `base` (hoje as chaves sao internas, mas `getFileStream(attachment.storageKey)` confia no banco); `Content-Type` do download vem de `declaredMimeType` enviado pelo cliente (`support.controller.ts:108`) - usar o MIME detectado por `inspectFile`. Magic bytes duplicados e parciais em `support-attachment.service.ts:62-69` (so png/jpeg/pdf) alem de `inspectFile` (suficiente).

## 7. LGPD (item 6)

### Correto
- Fluxo de direitos do titular: exportar, pedido de eliminacao com prazo, **anonimizacao** de funcionario desligado (apaga campos, biometria facial, sessoes, MFA) com retencao legal documentada (`privacy/data-subject.service.ts`); candidatos: retencao por vaga, consentimento versionado, anonimizacao por e-mail (`recruitment-privacy.service.ts`).
- `AuditInterceptor` redige campos sensiveis (regex com `cpf|email|phone|salary|bank|...` - `audit.interceptor.ts:9`).

### Achados
**A3 - alta - Nada sensivel e criptografado em repouso**
- Regra: LGPD art. 46 (medidas de seguranca tecnicas) e art. 11 (sensivel) https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm ; ANPD guia de seguranca https://www.gov.br/anpd/pt-br.
- Codigo: `CryptoService` (`common/crypto/crypto.service.ts`) e `CryptoModule` nao tem nenhum consumidor em `modules/`; `KMS_MASTER_KEY` e usada so em `mfa.service.ts` (segredo TOTP) e `temporary-password.ts`. `schema.prisma`: `Employee.cpf String? @unique` (`:582`), RG, ASO/saude (campos SST), `photoBase64`/`pdfBase64` do consentimento (`:1215-1216`), CPF do representante (`:335`) em texto puro. Biometria facial (`FaceEnrollment`) nao verificada (so existencia do modelo).
- Correcao: criptografia em nivel de campo para CPF/RG/saude/biometria com `CryptoService` (+ coluna de hash HMAC para busca/unicidade), rotacao de chave por versao (`kid`), ou no minimo criptografia de disco/backup comprovada.

**B13 - baixa - Chave com fallback silencioso**: `temporary-password.ts:3-9` deriva a chave do `JWT_SECRET` (ou de uma constante conhecida em dev) quando `KMS_MASTER_KEY` e invalida; em producao o `env.validation` impede, mas falhar fechado seria mais seguro.
**B14 - baixa - PII em logs**: `queue/workers/email-send.worker.ts:11` loga o e-mail do destinatario; `auth.service` grava `email` em `AuditLog.metadata`; `reportError` envia contexto ao Sentry (confirmar `sendDefaultPii:false`). Retencao de `AuditLog`/`RefreshSession.ip` nao definida (so sessoes expiram).
**A5 - alta - ver M7** (hard delete de dados de retencao obrigatoria).

## 8. Next.js (item 7)

### Correto
- Access token em memoria; refresh em cookie httpOnly; `localStorage` so guarda tema/sidebar/metadados (`auth-session.ts`). Nenhum `NEXT_PUBLIC_*` com segredo (somente `API_URL=/api`, chave publica Turnstile, feature flags). `dangerouslySetInnerHTML`: 4 usos, todos de conteudo estatico ou JSON-LD com `<` escapado (`job-details.tsx:220`). `images.unoptimized:true` evita o otimizador (SSRF). API via mesma origem (`/api`) = sem CORS no navegador.

### Achados
**M3 - media - Sem cabecalhos de seguranca no web**
- Regra: Next recomenda CSP (nonce via middleware/proxy), e cabecalhos em `headers()` (XFO/`frame-ancestors`, `nosniff`, Referrer-Policy, HSTS) https://nextjs.org/docs/app/guides/content-security-policy e https://nextjs.org/docs/app/api-reference/config/next-config-js/headers (via busca).
- Codigo: `next.config.js` `headers()` so define `Cache-Control`; nao ha `middleware.ts`; `infra/nginx-lb.conf`/`nginx-host-performance.conf` nao adicionam cabecalhos; o RUNBOOK afirma "CSP, HSTS, nosniff, XFO" mas isso e do helmet da API (respostas JSON), nao das paginas HTML. O nginx real do host nao esta no repo (nao verificado).
- Correcao: `headers()` com `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`/`frame-ancestors 'none'`, `Strict-Transport-Security`, `Permissions-Policy` e CSP (comece em Report-Only; exige nonce por causa dos scripts inline do `layout.tsx`).

**M8 - media - Token do candidato em localStorage** (`carreiras/_lib/candidate-api.ts:3-10`, chave `ir_candidate_token`): legivel por qualquer XSS; usar cookie httpOnly como no login de empresa, ou token curto.
**B15 - baixa - Sem route gate no servidor**: nao ha `middleware.ts`; a protecao de rota e client-side (`ProtectedRoute`); como a API reaplica guards, e so UX/flash de conteudo.

## 9. nginx e infraestrutura (item 8)

- `infra/nginx-lb.conf` (exemplo): TLS 443 com Let's Encrypt, redirect 80->443, proxy com `Host`/`X-Real-IP`/`X-Forwarded-For`/`Proto`. **Falta**: `ssl_protocols`/ciphers/OCSP/HSTS, `proxy_read_timeout`/`send_timeout`/`client_body_timeout` (padrao 60 s; o exemplo de performance usa 120 s), `limit_req` para `/api/auth/*`, `server_tokens off`, `client_max_body_size` por rota (global 50M vs corpo do app 1 MiB/14 MiB; `nginx-host-performance.conf` usa 25m), bloqueio externo de `/api/metrics` e `/api/health` completo. `infra/nginx-web.conf` serve SPA estatica: parece legado (o web e Next em Node). `infra/Caddyfile` e alternativa com TLS automatico, tambem sem cabecalhos.
- Compose: DB/Redis sem `ports`, API/Web em `127.0.0.1`, `mem_limit`, healthchecks, ClamAV interno 2 g, segredos exigidos (`:?`) - correto.
- **Nao verificado**: nginx real, firewall do host, certificados, backups (`infra/RUNBOOK-backup-e-resiliencia.md` descreve, nao testei).

## 10. Mapa de gravidade

| Id | Gravidade | Titulo |
|---|---|---|
| A1 | Alta | `FileInterceptor`/`res.set`/`pipe` do Express sob Fastify -> 500 (reproduzido) |
| A2 | Alta | Scan de anexos de suporte fail-open |
| A3 | Alta | Dados sensiveis sem criptografia em repouso (`CryptoService` sem uso) |
| A4 | Alta | Regras globais de folha editaveis por `CONTABIL` |
| A5 | Alta | `purgeCompany`/`deleteWithHistory` apagam dados de retencao legal (cascades) |
| M1 | Media | Throttler em memoria; login sem limite por IP; Turnstile opcional |
| M2 | Media | `RateLimitGuard` usa cabecalhos forjaveis |
| M3 | Media | Web sem CSP/XFO/nosniff/HSTS |
| M4 | Media | Guards opt-in; `RolesGuard` sem `@Roles` libera |
| M5 | Media | Codigo de reset 24 bits em claro |
| M6 | Media | Migracao manual vs Prisma: drift de producao nao medido; timestamp duplicado |
| M7 | Media | 118 cascades; sem filtro automatico de `deletedAt` |
| M8 | Media | Token do candidato em localStorage |
| B1-B15 | Baixa (8 agrupados) | `/health` completo publico; logger duplicado; `$connect` engolido; algoritmo JWT nao fixado; default 7d; DoS por bloqueio; bcryptjs/72 bytes; pool Prisma; defesa em profundidade `where:{id}`; gateway sem auth; storage sem `startsWith(base)`; chave KMS com fallback; PII em logs; sem route gate |

Contagem final: 0 criticas, 5 altas (A1-A5), 8 medias (M1-M8), 15 baixas (B1-B15).
