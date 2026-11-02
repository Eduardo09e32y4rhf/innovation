# Auditoria 03 - Dependencias, imagens Docker e GitHub Actions

Data da coleta: 2026-10-29. Nenhum arquivo de codigo, `package.json` ou lockfile foi alterado. Branch `chore/atualiza-next` (outro agente) nao foi tocada; tudo sobre Next abaixo e so diagnostico.

## 0. Metodo e limites (leia primeiro)

| Fonte | Status |
|---|---|
| registry npm (`npm view/outdated/audit`) | VERIFICADO (rede ok) |
| Docker Hub (`hub.docker.com/v2`) | VERIFICADO |
| nodejs.org, raw.githubusercontent.com | VERIFICADO |
| `git ls-remote` de tags das actions no github.com | VERIFICADO |
| endoflife.date (site e API) | BLOQUEADO. Usei o espelho `endoflife-date/endoflife.date/products/*.md` via raw.githubusercontent (mesmos dados, sem garantia de ser a ultima edicao) |
| www.prisma.io, docs.nestjs.com, redis.io, postgresql.org | BLOQUEADOS. Nest: usei `docs.nestjs.com/content/migration.md` via raw.githubusercontent (VERIFICADO). Prisma 7: guia oficial NAO acessivel; os breaking changes do Prisma 7 abaixo estao marcados NAO VERIFICADO (conhecimento previo + `engines`/`peerDependencies` do npm) |
| api.github.com / github.com/*/releases / NVD | BLOQUEADOS (403/sem acesso). Advisories vieram do `npm audit` (GHSA), nao de NVD |
| Changelog oficial do Next 15/16 | NAO VERIFICADO (nextjs.org bloqueado; escopo do outro agente) |

Ambiente da coleta: Node v22.22.0 / npm 10.9.4, enquanto o repo exige `node >=24 <25` e `npm >=11 <12`. O `npm audit`/`ls` nao depende disso, mas rode os comandos de upgrade em Node 24 / npm 11 para o lockfile sair igual ao do CI.

## 1. Numeros reais

| Item | Valor |
|---|---|
| `npm audit` total | 60 (1 critical, 43 high, 11 moderate, 5 low) |
| `npm audit --omit=dev` (producao) | 44 (1 critical, 33 high, 8 moderate, 2 low) |
| Somente dev | 16 pacotes: @nestjs/cli, @next/eslint-plugin-next, @prisma/config, @vitest/mocker, baseline-browser-mapping, brace-expansion, browserslist, deepmerge, deepmerge-ts, eslint-config-next, fork-ts-checker-webpack-plugin, glob, postcss-selector-parser, prisma, vite, vitest |
| Das 44 de producao, 27 sao `@jimp/*` + `jimp` | `jimp` e dependencia DIRETA da raiz mas **nenhum arquivo do repo importa jimp** (grep ts/js/cjs/mjs/tsx fora de node_modules = 0). Remover elimina ~27 high de uma vez |
| Pacotes desatualizados (`npm outdated`, raiz com workspaces) | 67 entradas (pacote x local); 40 com major diferente do latest (inclui @types, 0.x e Nest que renumerou) |
| Dependencia DEPRECATED no registro | 4: `@ip-location-db/dbip-city-mmdb`, `@types/bull`, `cache-manager-ioredis-yet`, `prom-client` |
| `npm ls --all` | sem duplicata problematica de framework; so `extraneous` `@napi-rs/wasm-runtime@1.1.6` e UNMET de optional deps de plataforma (swc darwin/arm, @nestjs/microservices opcional) - ruido, nao bloqueia |
| Playwright (`tests-e2e`, lock proprio) | 1.61.1 instalado no lock; latest 1.64.1 (minor) |

Nao existem no repo (itens pedidos): `argon2`, `bcrypt` (usa `bcryptjs` 3.0.3, igual ao latest), `axios`, `undici` direto, `jsonwebtoken` direto (vem via `@nestjs/jwt` 11.0.2 -> `jsonwebtoken` 9.0.3 = latest, sem advisory no audit), `class-validator` ok.

Divergencias de instalado x declarado (o `node_modules` local nao bate com o lock/package.json): `@nestjs/platform-express` e `platform-fastify` instalados 11.2.7 (declarado ^11.1.27), `@nestjs/common/core` 11.1.28 na raiz. Rode `npm ci` antes de qualquer decisao baseada em "instalado".

## 2. Tabela de dependencias DIRETAS de producao

Legenda: Gap = lacuna de major entre o package.json e o latest do registro. Pub = data de publicacao do latest. Nenhuma tem licenca problematica (todas MIT/Apache/ISC/BSD); excecao: `@ip-location-db/dbip-city-mmdb` e CC-BY-4.0 (exige atribuicao DB-IP) e esta DEPRECATED pelo mantenedor.

### 2.1 apps/api

| Pacote | package.json | Instalado | Latest | Gap | Pub latest | Deprecated | Licenca |
|---|---|---|---|---|---|---|---|
| @nestjs/common / core / websockets / platform-socket.io | ^11.1.27 | 11.1.28 | 12.3.2 | 1 major | 2026-10-27 | nao | MIT |
| @nestjs/platform-fastify | ^11.1.27 | 11.2.7 | 12.3.2 | 1 | 2026-10-27 | nao | MIT |
| @nestjs/platform-express | ^11.1.27 | 11.2.7 | 12.3.2 | 1 | 2026-10-27 | nao | MIT |
| @nestjs/bull | ^11.0.4 | 11.0.4 | 12.0.0 | 1 | 2026-08-27 | nao | MIT |
| @nestjs/cache-manager | 3.1.3 | 3.1.3 | 12.0.2 | 9 (renumerou p/ 12) | 2026-10-27 | nao | MIT |
| @nestjs/config | ^4.0.4 | 4.0.4 | 12.0.1 | 8 | 2026-09-22 | nao | MIT |
| @nestjs/jwt | ^11.0.2 | 11.0.2 | 12.0.3 | 1 | 2026-10-12 | nao | MIT |
| @nestjs/schedule | 6.1.3 | 6.1.3 | 12.0.2 | 6 | 2026-09-14 | nao | MIT |
| @nestjs/swagger | 11.4.7 | 11.4.7 | 12.0.5 | 1 | 2026-10-27 | nao | MIT |
| @nestjs/throttler | ^6.5.0 | 6.5.0 | 6.7.1 | 0 | 2026-09-24 | nao | MIT |
| @fastify/cookie | ^11.0.2 | 11.1.1 | 11.1.5 | 0 | 2026-10-27 | nao | MIT |
| @fastify/helmet | ^13.0.2 | 13.1.0 | 13.2.0 | 0 | 2026-10-13 | nao | MIT |
| @fastify/multipart | 10.1.0 | 10.1.0 | 10.1.6 | 0 | 2026-10-22 | nao | MIT |
| fastify (raiz, pin) | 5.12.5 | 5.12.5 | 5.12.7 | 0 | 2026-10-13 | nao | MIT |
| @fastify/static (raiz) | 10.1.6 | 10.1.6 | 10.1.8 | 0 | 2026-10-27 | nao | MIT |
| @prisma/client | ^6.6.0 | 6.19.3 | 7.10.1 (dist-tag `latest` do `prisma` CLI aponta para 8.0.0-rc.28, RC; NAO usar) | 1 | 2026-10-15 | nao | Apache-2.0 |
| bullmq | ^5.79.1 | 5.80.2 | 6.5.1 | 1 | 2026-10-28 | nao | MIT |
| bull | ^4.16.5 | 4.16.5 | 4.16.5 | 0 | 2024-12-18 (sem release ha 10 meses; manutencao) | nao | MIT |
| ioredis | 5.11.1 | 5.11.1 | 6.0.0 | 1 | 2026-07-31 | nao | MIT |
| cache-manager | 7.2.9 | 7.2.9 | 7.2.9 | 0 | 2026-06-27 | nao | MIT |
| cache-manager-ioredis-yet | 2.1.2 | 2.1.2 | 2.1.2 | 0 | 2024-09-23 | **SIM** ("cache-manager v6 usa Keyv") | MIT |
| @socket.io/redis-adapter / socket.io | 8.3.0 / ^4.8.1 | 8.3.0 / 4.8.3 | 8.3.0 / 4.8.4 | 0 | 2024-03 / 2026-09 | nao | MIT |
| class-validator | ^0.14.1 | 0.14.1 | 0.15.1 | 0 (0.x: minor = breaking) | 2026-02-26 | nao | MIT |
| class-transformer | ^0.5.1 | 0.5.1 | 0.5.1 | 0 | 2021-11-22 (abandonado, estavel) | nao | MIT |
| zod | ^4.4.3 | 4.4.3 | 4.6.7 | 0 | 2026-10-12 | nao | MIT |
| bcryptjs | ^3.0.3 | 3.0.3 | 3.0.3 | 0 | 2025-11-02 | nao | BSD-3 |
| nodemailer | 10.1.0 | 10.1.0 | 10.3.1 | 0 | 2026-10-29 | nao | MIT-0 |
| pdfkit | 0.19.1 | 0.19.1 | 0.20.2 | 0 (0.x) | 2026-08-30 | nao | MIT |
| exceljs | ^4.4.0 | 4.4.0 | 4.4.0 | 0 | 2023-10-19 (sem release ha 3 anos) | nao | MIT |
| multer (via platform-express; declarado direto) | 2.4.0 | 2.4.0 | 2.5.0 | 0 | 2026-10-22 | nao | MIT |
| express | ^5.1.0 | 5.2.1 | 5.3.0 | 0 | 2026-10-09 | nao | MIT |
| openai | 6.49.0 | 6.49.0 | 7.45.1 | 1 | 2026-10-27 | nao | Apache-2.0 |
| @whiskeysockets/baileys | ^7.0.0-rc13 | 7.0.0-rc13 | 7.0.0-rc14 | pre-release | 2026-07-29 | nao | MIT |
| @sentry/node | 11.4.0 | 11.4.0 | 11.10.0 | 0 | 2026-10-28 | nao | MIT |
| @willsoto/nestjs-prometheus | 6.1.0 | 6.1.0 | 7.0.0 | 1 | 2026-10-08 | nao | Apache-2.0 |
| prom-client | 15.1.3 | 15.1.3 | 15.1.3 | 0 | 2024-06-27 | **SIM** ("substituido por @prometheus-io/client") | Apache-2.0 |
| nest-winston / winston / winston-loki | 1.10.2 / 3.19.0 / 6.1.5 | idem | 2.0.0 / 3.19.0 / 6.1.7 | 1 (nest-winston) | 2026-09-14 | nao | MIT |
| @ip-location-db/dbip-city-mmdb | 2.3.2026060513 | idem | idem | 0 | 2026-06-05 | **SIM** ("Package no longer supported") | CC-BY-4.0 |
| maxmind, date-fns, date-fns-tz, qrcode, clamscan, reflect-metadata, rxjs | fixos | = | = latest | 0 | - | nao | MIT/Apache |
| @types/bull | ^3.15.9 | 3.15.9 | 4.10.4 | - | 2024-10-23 | **SIM** (stub; bull ja traz tipos) | MIT |

Observacoes: `bullmq` esta declarado mas **nao e importado em nenhum arquivo** (todo o codigo usa `bull` via `@nestjs/bull`); declarar `@nestjs/bull` + `bull` + `bullmq` e redundante. `FileInterceptor` de `@nestjs/platform-express` e usado em `schedule-hub/hub.controller.ts` e `support/support.controller.ts`, mas o app sobe com `FastifyAdapter` (main.ts:48); confirme se esses endpoints de upload funcionam (multer so e exercitado com adapter Express) - se nao funcionam, sao codigo morto e o advisory do multer fica sem superficie.

### 2.2 apps/web

| Pacote | package.json | Instalado | Latest | Gap | Pub latest | Deprecated | Licenca |
|---|---|---|---|---|---|---|---|
| next | ^14.2.35 | 14.2.35 | 16.4.3 | **2 majors** | 2026-10-23 | nao (mas 14.x sem mais patch: ultima 14.2.35, tag `next-14`) | MIT |
| react / react-dom / react-is | ^18.3.1 / 18.3.1 | 18.3.1 | 19.3.1 | 1 | 2026-10-14 | nao | MIT |
| framer-motion | ^11.0.3 | 11.18.2 | 14.7.1 | 3 | 2026-10-27 | nao | MIT |
| lucide-react | ^0.330.0 | 0.330.0 | 1.64.0 | 0.x -> 1.x | 2026-10-29 | nao | ISC |
| recharts | ^3.8.1 | 3.9.2 | 3.10.1 | 0 | 2026-07-25 | nao | MIT |
| tailwind-merge | ^2.2.1 | 2.6.1 | 3.7.0 | 1 (exige Tailwind 4) | 2026-09-12 | nao | MIT |
| sonner / clsx / qrcode / zod | - | 2.0.7 / 2.1.1 / 1.5.4 / 4.4.3 | 2.0.8 / 2.1.1 / 1.5.4 / 4.6.7 | 0 | - | nao | MIT |
| @vladmandic/face-api | 1.7.15 | 1.7.15 | 1.7.15 | 0 | 2025-02-05 (sem release ha 20 meses) | nao | MIT |
| @types/qrcode | 1.5.5 | 1.5.5 | 1.5.6 | 0 | 2025-10-24 | nao | MIT |

### 2.3 Ferramentas (dev) destacadas

| Pacote | Instalado | Latest | Gap | Nota |
|---|---|---|---|---|
| typescript | 5.9.3 | 7.0.2 | 2 majors (6 e 7) | Nest 12 CLI/schematics exige TS 6; runtime 12 aceita TS ^5.5 \|\| ^6 |
| eslint | 8.57.1 | 10.13.0 | 2 | ESLint 8 sem suporte upstream; `next lint` 14 depende dele |
| eslint-config-next | 14.2.35 | 16.4.3 | 2 | acompanha o Next; traz `glob` vulneravel (dev) |
| vitest / @vitest/coverage-v8 | 4.1.10 | 4.1.12 (wanted) / 5.0.5 (latest) | 1 | 2 advisories moderate em @vitest/mocker (corrigido em 4.1.12, sem major) |
| @playwright/test (tests-e2e) | 1.61.1 | 1.64.1 | 0 | minor |
| @swc/core, supertest, dotenv, unplugin-swc | - | 1.16.20 / 7.3.1 / 18.0.9 / 2.0.0 | 0-1 | baixa prioridade |
| tailwindcss | 3.4.19 | 4.3.3 | 1 | migracao grande, opcional |
| prisma (CLI) | 6.19.3 | 7.10.1 estavel (8.0.0-rc.28 e RC) | 1 | acompanha @prisma/client |

## 3. Vulnerabilidades (npm audit) - producao x desenvolvimento

### 3.1 Producao

| Pacote (versao instalada) | Severidade max | Advisory (GHSA) | Correcao sem major? |
|---|---|---|---|
| next 14.2.35 | **critical** (CVSS 9.0) | 30 advisories. Criticos: GHSA-p293-qw3h-jr36 (RCE em host Windows), GHSA-2xp9-vwfh-vxw4 (RCE no Image Optimizer com AVIF), GHSA-2464-fhr4-w9xw (RCE Image Optimizer com SVG, ate 15.5.27). High: GHSA-c4j6-fc7j-m34r (SSRF em WebSocket upgrade, 8.6), GHSA-89xv-2m56-2m9x e GHSA-p9j2-gv94-2wf4 (SSRF), GHSA-m99w-x7hq-7vfj / p3m5-59mp-jv5r / q4gf-8mx6-v5v3 / 8h8q-6873-q5fj (DoS Server Actions/RSC), GHSA-36qx-fr4f-26g5 (bypass de middleware com i18n) | **NAO**. A linha 14.x nao recebeu patch (ultima = 14.2.35). Faixas corrigidas: >=15.5.28 e 16.x. Alvo: 16.4.3 (ou backport 15.5.28; confirmar que 15.5.28 cobre os advisories `<=15.5.27`) |
| fastify 5.12.5 | low | GHSA-389g-gv7q-r4x8 (bypass de validacao de header, CVSS 3.7), corrigido em 5.12.6 | SIM: 5.12.7 |
| fast-uri (dep de fastify/ajv) | moderate | GHSA-w74x-v6f9-j3xg, wjr9-j795-jxcr, xhq7-xmqj-769h, 333x-w4r6-6crp (4.0.0 a 4.2.2) | SIM (`npm update fast-uri`) |
| multer 2.4.0 | high 7.5 | GHSA-q7qp-rjg7-q26m (DoS por fileFilter assincrono pendente) | SIM: 2.5.0 |
| @nestjs/platform-express 11.2.7 | high | via multer | SIM, apos multer 2.5.0 (ou 11.2.8) |
| @nestjs/platform-fastify | low | via fastify | SIM |
| body-parser (via express) | high 7.5 | GHSA-27r3-jxmh-p828 (DoS com bytes apos corpo comprimido), 2.0.0 a 2.3.x | SIM: `express` 5.3.0 / body-parser >=2.4.0 |
| qs | moderate | GHSA-6pq8-jhm2-2vcw (<=6.16.0) | SIM (update transitivo) |
| nodemailer 10.1.0 | moderate 6.5 | GHSA-8c8m-p3m8-cjg8, GHSA-m943-m63m-w62w, GHSA-85x2-q946-cp5h (addressparser: destinatario extra via aspas/comentario; corrigido em 10.1.4) | SIM: 10.3.1 |
| zod 4.4.3 (api e web) | high 7.5 | GHSA-mrhx-c7xc-m3w5 (memoria em colecoes grandes, <4.6.6) | SIM: 4.6.7 |
| jimp 1.6.1 + 26 `@jimp/*` | high | via zod vulneravel embutido; `npm audit fix --force` sugere "downgrade" para jimp 0.22.12 (absurdo) | Melhor: `npm uninstall jimp` (nao e usado) |
| @nestjs/swagger 11.4.7 -> js-yaml | high 7.5 | GHSA-5p4m-2wfm-xmqj, GHSA-2883-xcg3-v3hh (CPU quadratico; so afeta parse de YAML nao confiavel; o swagger gera, nao le YAML de usuario) | parcial: `overrides` p/ js-yaml >=4.3.2 ou Nest 12 |
| exceljs 4.4.0 / bull 4.16.5 -> uuid <11.1.1 | moderate 7.5 | GHSA-w5hq-g745-h8pq (so quando `buf` e passado a uuid v3/v5/v6) | NAO ha fix (exceljs/bull sem release). Risco real baixo. Mitigar com `overrides` ou aceitar e registrar |
| postcss (embutido no next 14, 8.4.31) | high | GHSA-6g55-p6wh-862q, r28c-9q8g-f849 (sourceMappingURL), qx2v-qp2m-jg93 | so resolve com upgrade do Next (a copia raiz 8.5.23 do web e `postcss ^8.5.15`, ok) |

### 3.2 Somente desenvolvimento (nao vao para a imagem de producao se o build for multi-stage; HOJE `apps/*/Dockerfile` fazem `npm ci` completo e rodam com devDeps, ver secao 6)

| Pacote | Sev | Advisory | Correcao |
|---|---|---|---|
| prisma CLI 6.19.3 -> @prisma/config -> deepmerge-ts <8 | high | GHSA-ggr8-5vv4-36mx (stack exhaustion em merge recursivo) | Prisma >=7.10.1 (faixa vulneravel termina em 7.10.0). Na linha 6.x nao ha fix |
| vitest 4.1.10 / @vitest/mocker | moderate (CVSS 5.9 / 4.7) | GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8 | vitest 4.1.12 (sem major) |
| vite 8.0.0 a 8.1.5 | high | launch-editor GHSA-698v-4r3x-3vcv / r825-w8mm-5pxw / 587h-7wmj-h5pm; Vite GHSA-rq7h-c2jc-7f22, 9jrq-w75r-8gcw | `npm update vite` |
| eslint-config-next -> @next/eslint-plugin-next -> glob 10.2-10.4.x | high | GHSA-5j98-mcp5-4vw2 (so CLI `glob -c`) | upgrade do Next/eslint-config-next 16 |
| browserslist <=4.28.6, baseline-browser-mapping, brace-expansion, postcss-selector-parser | high/moderate | GHSA-c83g-rgw3-j3cx, 73wf-gq98-2v4g, w5vr-8v7q-w6rv, q2hr-2g5m-vwhr, rj75-hqrm-r3gf | `npm update` (transitivos) |
| @nestjs/cli 11.0.24 -> deepmerge, fork-ts-checker-webpack-plugin | low | GHSA-gcqx-w48m-w2h4 | Nest CLI 12 |

### 3.3 CVEs/advisories das versoes fixadas pedidas

| Pacote@versao | Resultado |
|---|---|
| next@14.2.35 | VULNERAVEL (secao 3.1). Nota: o fato de ser a "ultima 14.x" nao significa corrigida |
| fastify@5.12.5 | 1 low, corrigido em 5.12.6 |
| jsonwebtoken@9.0.3 | sem advisory no audit de hoje (latest) |
| @prisma/client@6.19.3 | sem advisory proprio; CLI afetado via deepmerge-ts (dev) |
| class-validator@0.14.1 | sem GHSA no audit, mas o changelog oficial lista 0.14.3 ("Fixed a vulnerability by bumping validator.js") e 0.14.4 (validator.js 13.15.22): **0.14.1 carrega validator.js com falhas ja corrigidas** -> subir para 0.14.4 (sem breaking) |
| nodemailer@10.1.0 | 3 moderate (addressparser) |
| bcryptjs@3.0.3, pdfkit@0.19.1, socket.io@4.8.3, ioredis@5.11.1, bullmq@5.80.2 | sem advisory |

NAO VERIFICADO: consulta a NVD/GitHub Advisory Database direta (bloqueadas). O audit do npm cobre apenas o banco GHSA.

## 4. Pacotes com salto de major ou vulneraveis: esforco e risco

Esforco = tempo de dev + testes. Risco = chance de regressao em producao. Cada item cita o que foi confirmado por grep neste repo.

| Atualizacao | Esforco | Risco | Breaking changes que realmente afetam ESTE codigo |
|---|---|---|---|
| **Next 14 -> 16** (web) | Alto (3-6 dias) | Alto | NAO VERIFICADO (nextjs.org bloqueado, e outro agente cuida). Pontos do repo a vigiar: 274 arquivos `use client`, 94 usos de `next/navigation`, 38 arquivos com `params: {`, (Next 15+ torna `params`/`searchParams` assincronos), `redirects()` extenso em `next.config.js` (formato `has/query` precisa ser retestado), `images.unoptimized: true` (neutraliza o Image Optimizer, ja reduz superficie dos RCE de imagem mas nao dos demais), `eslint.ignoreDuringBuilds: true` + `next lint` (removido no 16: migrar para ESLint CLI). Ja exigira React 19 |
| **React 18 -> 19** (web, e raiz declara react/react-dom sem uso aparente) | Medio | Medio | 5 arquivos com `forwardRef` (continua funcionando, deprecado), `@types/react` 18 -> 19, `framer-motion` 11 -> 12+ e `lucide-react` precisam de versoes compativeis; `react-is` fixado em 18.3.1 deve subir junto |
| **Nest 11 -> 12** (api) | Medio (2-4 dias) | Medio | Do guia oficial (VERIFICADO): pacotes viram ESM-only, consumidos via `require(esm)` (Node 24 ok; app e CJS e pode continuar CJS). Afeta: (1) ordem dos lifecycle hooks (8 arquivos usam onModuleInit/Destroy/OnApplicationBootstrap; app chama `enableShutdownHooks`); (2) `@Optional()` nao herdado em construtor redeclarado (8 arquivos usam `@Optional()`, 0 classes `extends ...Service` -> sem impacto provavel); (3) `@nestjs/config` 12 troca Joi por Standard Schema - o repo usa `validate: validateEnv` (funcao propria), compativel; (4) `@nestjs/cache-manager` 12 exige `keyv>=5` e `cache-manager>=6`: o repo usa `cache-manager-ioredis-yet` (DEPRECATED) em `app.module.ts:55`; trocar por `@keyv/redis` + `CacheModule` com `stores`; (5) HTTP adapter error mapping reformulado (Fastify) -> rodar testes de contrato/seguranca; (6) CLI 12 exige TypeScript 6 (`nest upgrade` sobe TS), schematics exigem Node >=24.15; `@nestjs/swagger` 12 aceita TS 5.5+ ou 6; (7) `@nestjs/bull` 12 aceita Nest 11 e 12 (peer) e continua com `bull` 4, sem mudanca de codigo. `platform-fastify` 12 tem peers `@fastify/static ^10.1.2` e `@fastify/multipart ^10.1.0` (ja atendidos) |
| **Prisma 6 -> 7** (api, 48 arquivos importam `@prisma/client`) | Alto (3-5 dias) | Alto | NAO VERIFICADO no guia oficial (prisma.io bloqueado); baseado em conhecimento previo e `engines` do npm (client 7.10.1: Node ^20.19 \|\| ^22.12 \|\| >=24, TS >=5.4): (a) driver adapter obrigatorio (`@prisma/adapter-pg` + `pg`); os 4 seeds fazem `new PrismaClient()` sem adapter (`seed-admin.cjs`, `seed-pricing.ts`, `seed-plans-catalog.ts`, `seed-realistic-demo.ts`) e o `PrismaService`; (b) URL do datasource sai do `schema.prisma` (hoje `url = env("DATABASE_URL")`) para `prisma.config.ts`; scripts `prisma ... --schema` da raiz e `migrate-vps-db.js` precisam ser revistos; (c) generator `prisma-client-js` (hoje) passa a legado, novo `prisma-client` exige `output` e e ESM; (d) `.env` deixa de ser carregado automaticamente (Dockerfiles e CI); (e) 21 usos de `$queryRaw/$executeRaw` e `Prisma.Decimal`/tipos precisam de regressao. Sem `$use` no codigo (0). **Nao ir para Prisma 8 (so RC; o dist-tag `latest` do npm aponta para o RC 8.0.0-rc.28)** |
| **class-validator 0.14 -> 0.15** (120 arquivos usam) | Baixo | Baixo | Unico breaking oficial: `@IsIBAN(options)` - **0 usos de IsIBAN no repo**. Adiciona `validateIf`. Antes disso, minimo: 0.14.4 |
| **ioredis 5 -> 6** | Baixo-medio | Medio | 3 arquivos (`redis.service.ts`, `redis-io.adapter.ts`, `app.module.ts` via cache store). Guia de migracao do ioredis 6 NAO VERIFICADO. Depende de `@socket.io/redis-adapter` 8.3.0 e do store do cache aceitarem v6: validar antes. P2 |
| **bullmq 5 -> 6** | Nenhum | Nenhum | 0 imports. Remover a dependencia em vez de atualizar |
| **openai 6 -> 7** | Baixo | Baixo-medio | 1 arquivo (`ai/ai.service.ts`). Guia NAO VERIFICADO |
| **nodemailer 10.1.0 -> 10.3.1** | Baixo | Baixo | Mesmo major, 1 arquivo (`mail.service.ts`). Corrige 3 advisories |
| **multer 2.4 -> 2.5**, **fastify 5.12.7**, **zod 4.6.7**, **@fastify/* **, **vitest 4.1.12** | Baixo | Baixo | Mesmo major |
| **pdfkit 0.19 -> 0.20** | Baixo | Medio | 0.x, 4 arquivos (`document.service.ts`, specs de PDF). Rodar `npm run check:official-pdfs` (existe no repo) |
| **eslint 8 -> 10 / eslint-config-next 14 -> 16** | Medio | Baixo | Config `.eslintrc.json` (legado) precisa virar flat config; acoplado ao upgrade do Next |
| **typescript 5.9 -> 6/7** | Medio | Medio | Fazer junto do Nest 12 (TS 6). TS 7 (compilador nativo) nao e exigido por nada; deixar para depois |
| **framer-motion 11 -> 14, lucide-react 0.330 -> 1.x, tailwind-merge 2 -> 3, tailwindcss 3 -> 4** | Medio cada | Baixo-medio | Visuais; 185 arquivos importam lucide (icones renomeados em 1.x), tailwind 4 e migracao de config. P2 |
| **jimp** | Remocao | Nenhum | Sem uso no codigo (confirmar em `scripts/` e docs antes do `npm uninstall`) |

## 5. Imagens Docker e EOL

| Imagem usada | Tag resolvida hoje (Docker Hub, digest igual) | Ultima do ramo | EOL (espelho endoflife.date) | Veredito |
|---|---|---|---|---|
| `postgres:16-alpine` (7 compose + CI) | 16.15-alpine3.24 (atualizada 2026-10-26) | 16.15 (2026-08-10) | **2028-11-09** | OK e suportada. PG 17.11 (EOL 2029-11-08) e 18.6 (EOL 2030-11-14) existem; migrar de major exige dump/restore ou pg_upgrade. P2, nao urgente. A tag flutuante `16-alpine` recebe patch sozinha so no `docker compose pull` |
| `redis:7-alpine` (compose, CI) | 7.4.12-alpine3.21 (atualizada 2026-10-29) | 7.4.12 | ciclo 7.4: 2029-12-01 (no espelho; 7.0 ja EOL desde 2024-07-29, mas a tag `7` resolve para 7.4) | OK. Redis 8.x (8.2 EOL 2030-09-01) existe; licenca do Redis mudou a partir da 7.4 (RSALv2/SSPL; 8.x adiciona AGPLv3): avaliar Valkey se isso importar |
| `node:24-alpine` (apps/api, apps/web Dockerfile) | 24.22.2-alpine3.24 (2026-10-28) | 24.22.2 (LTS "Krypton" desde 2025-10-28) | **2028-04-30** | OK, e a tag recomendada |
| `node:20-alpine` (`infra/Dockerfile.api`, `infra/Dockerfile.web`, 5 FROM) | 20.20.2 | - | **2026-04-30 (JA EOL)** | **P1: fora de suporte.** O `package.json` exige Node >=24, entao essas imagens nem atendem `engines` |
| `clamav/clamav:stable` (docker-compose.prod.yml) | 1.5.4 (digest = `:latest` = `:1.5`) | 1.5.4 | ramo 1.5: sem EOL definido; 1.4: 2027-08-15; 1.3: 2026-02-07 (EOL) | OK. `docker-compose.yml` (dev) usa `:latest`, equivalente hoje |
| `nginx:1.27-alpine` (infra/Dockerfile.web) | NAO VERIFICADO (nao consultei tag) | - | - | provavel defasagem (1.27 e ramo antigo); verificar |
| Outros nao pedidos mas flutuantes: `prom/prometheus:latest`, `grafana/*:latest`, `grafana/loki:latest`, `containrrr/watchtower` (sem tag, projeto arquivado), `tiredofit/freescout:latest`, `louislam/uptime-kuma:latest` | - | - | - | P2: fixar versao; watchtower sem tag em producao e risco de supply chain/atualizacao automatica nao controlada |

Nenhuma imagem esta fixada por digest (`@sha256:`). Os Dockerfiles de `apps/api` e `apps/web` usam `npm ci` completo (inclui devDependencies, build e runtime no mesmo stage) e nao tem `USER` nao-root nos trechos lidos: fora do escopo desta auditoria, registrado para a auditoria de infra.

## 6. GitHub Actions (`.github/workflows`)

| Action | Usada | Mais recente (tags v* em git ls-remote) | Fixada por | Situacao |
|---|---|---|---|---|
| actions/checkout | `@v4` (12 usos) | v7.0.1 | tag movel | 3 majors atras |
| actions/setup-node | `@v4` (7) | v7.1.0 | tag movel | 3 majors atras |
| actions/upload-artifact | `@v4` (3) | v7.0.2 | tag movel | 3 majors atras |
| docker/build-push-action | `@v6` | v7.4.0 | tag movel | 1 major |
| docker/login-action | `@v3` | v4.7.0 | tag movel | 1 major |
| docker/setup-buildx-action | `@v3` | v4.4.1 | tag movel | 1 major |
| github/codeql-action (init/analyze) | `@v3` | v4.39.1 | tag movel | 1 major |
| softprops/action-gh-release | `@v2` | v3.0.3 | tag movel | 1 major |
| appleboy/ssh-action | `@v1.2.0` | v1.2.5 | tag (patch) | 5 patches atras; **executa SSH com segredos de producao em `deploy.yml`/`rollback.yml`** |

Nenhuma action esta fixada por SHA. As de terceiros (`appleboy/ssh-action`, `softprops/action-gh-release`) sao a maior exposicao de supply chain por manipularem credenciais de deploy / token de release. `permissions:` esta declarado em todos os workflows (bom) e ha `dependabot.yml` semanal para npm e github-actions (bom; se estivesse ativo, estes atrasos seriam PRs abertos: verificar se os PRs estao sendo ignorados). Nao ha etapa `npm audit` no CI. Breaking changes dessas majors de actions: NAO VERIFICADO (nao li os release notes; github.com/releases bloqueado). Em geral exigem runner recente (Node 24 runtime das actions); `upload-artifact` v4 -> v7 e `checkout` v4 -> v7 costumam ser drop-in, confirmar em uma branch.

## 7. Plano priorizado

Ordem de execucao sugerida: P0 (um unico PR com tudo que e mesmo-major) -> P0 Next (branch do outro agente) -> P1 -> P2. Rodar tudo em Node 24 / npm 11, depois `npm run quality:gate`.

### P0 - Seguranca (explorabilidade remota ou DoS de producao)

| # | Acao | Comando exato | Esforco/Risco |
|---|---|---|---|
| P0-1 | Next 14.2.35 sai da linha sem patch (1 critical, varios high: RCE no Image Optimizer, SSRF, DoS de Server Actions). Ja em curso em `chore/atualiza-next`. Alvo: 16.4.3 (ou 15.5.28) com React 19 | `npm install next@16.4.3 react@19.3.1 react-dom@19.3.1 react-is@19.3.1 --workspace apps/web && npm install -D eslint-config-next@16.4.3 @types/react@19 @types/react-dom@19 --workspace apps/web` (nao executar aqui: outro agente) | Alto/Alto |
| P0-2 | Remover `jimp` (nao usado; elimina ~27 high do audit de producao) | `grep -rn jimp scripts apps tests tools` (confirmar 0) e `npm uninstall jimp` | Baixo/Nenhum |
| P0-3 | Correcoes mesmo-major de producao: fastify, multer, nodemailer, zod, fastify plugins, express/body-parser, fast-uri, qs, class-validator 0.14.4 | `npm install fastify@5.12.7 @fastify/static@10.1.8 && npm install -w apps/api multer@2.5.0 nodemailer@10.3.1 @fastify/cookie@^11.1.5 @fastify/helmet@^13.2.0 @fastify/multipart@10.1.6 express@^5.3.0 class-validator@0.14.4 zod@4.6.7 && npm install -w apps/web zod@4.6.7 && npm install class-validator@0.14.4 && npm update body-parser qs fast-uri` | Baixo/Baixo |
| P0-4 | Dev/CI: vitest e vite | `npm install -D vitest@4.1.12 @vitest/coverage-v8@4.1.12 && npm update vite` | Baixo/Baixo |
| P0-5 | Resolver multer: confirmar se `FileInterceptor` funciona sob Fastify; se for codigo morto, remover `multer`/`@nestjs/platform-express` e a superficie do advisory | (revisao de codigo em `hub.controller.ts:152`, `support.controller.ts:88`) | Baixo/Baixo |
| P0-6 | js-yaml via swagger (CPU) e uuid via exceljs/bull sem fix: aceitar e registrar, ou `overrides` | `"overrides": { "js-yaml": ">=4.3.2" }` no package.json raiz (so apos P0-3, testar swagger) | Baixo/Baixo |

Resultado esperado de P0-2..P0-4: o audit de producao cai de 44 para os pacotes ligados ao Next (30 advisories + postcss embutido) e uuid (exceljs/bull) e js-yaml; o critical so some com P0-1.

### P1 - Fim de suporte / suporte do fornecedor acabando

| # | Acao | Comando | Esforco/Risco |
|---|---|---|---|
| P1-1 | `infra/Dockerfile.api` e `infra/Dockerfile.web` em `node:20-alpine` (EOL 2026-04-30) | trocar as 5 linhas `FROM node:20-alpine` por `node:24-alpine` (e revisar `nginx:1.27-alpine`) | Baixo/Baixo |
| P1-2 | Next 14 (sem patches), ESLint 8 (sem suporte) e `next lint` | cobertos por P0-1 + `npm install -D eslint@^9` apos Next 16 e migrar `.eslintrc.json` para flat config | Medio/Baixo |
| P1-3 | GitHub Actions desatualizadas e por tag movel; fixar por SHA as de terceiros | editar `.github/workflows/*.yml` para `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `docker/build-push-action@v7`, `docker/login-action@v4`, `docker/setup-buildx-action@v4`, `github/codeql-action/*@v4`, `softprops/action-gh-release@v3`, `appleboy/ssh-action@v1.2.5`; para terceiros usar `uses: org/action@<sha> # vX.Y.Z` (obter o SHA com `git ls-remote https://github.com/appleboy/ssh-action refs/tags/v1.2.5`) | Baixo/Baixo |
| P1-4 | Prisma 6 sem fix do CLI vulneravel (dev) e Prisma 8 chegando; planejar 7.10.1 (nao 8 RC) | `npm install @prisma/client@7.10.1 --workspace apps/api && npm install -D prisma@7.10.1 --workspace apps/api` (apos adaptar `schema.prisma`, criar `prisma.config.ts`, adapter `@prisma/adapter-pg`, atualizar 4 seeds, `PrismaService`; branch propria) | Alto/Alto |
| P1-5 | Dependencias deprecated: `cache-manager-ioredis-yet`, `@types/bull`, `prom-client`, `@ip-location-db/dbip-city-mmdb` | `npm uninstall @types/bull -w apps/api` (bull ja tem tipos; testar `tsc`); `npm install @keyv/redis -w apps/api` e migrar `app.module.ts:55,76` (necessario para Nest 12); manter `prom-client` ate existir sucessor estavel; avaliar substituir a base DB-IP (licenca CC-BY-4.0 + descontinuada) por GeoLite2/`maxmind` direto | Medio/Medio |

### P2 - Manutencao

| # | Acao | Comando | Esforco/Risco |
|---|---|---|---|
| P2-1 | Nest 12 (junto com TS 6) | `npm i -g @nestjs/cli@latest @nestjs/schematics@latest` e, na raiz da branch dedicada, `nest upgrade --dry-run` depois `nest upgrade`; depois `npm run quality:gate` | Medio/Medio |
| P2-2 | `@nestjs/*` mesmo-major restantes (11.2.8, throttler 6.7.1) enquanto Nest 12 nao entra | `npm install -w apps/api @nestjs/common@^11.2.8 @nestjs/core@^11.2.8 @nestjs/platform-fastify@^11.2.8 @nestjs/platform-express@^11.2.8 @nestjs/platform-socket.io@^11.2.8 @nestjs/websockets@^11.2.8 @nestjs/throttler@^6.7.1 @nestjs/bull@^11.0.5` e fixar o root em `11.2.8` | Baixo/Baixo |
| P2-3 | Remover `bullmq` (nao usado) e consolidar fila | `npm uninstall bullmq -w apps/api` | Baixo/Nenhum |
| P2-4 | class-validator 0.15.1, ioredis 6, openai 7, pdfkit 0.20, socket.io 4.8.4, sentry 11.10, baileys rc14, nest-winston 2 | `npm install -w apps/api class-validator@0.15.1 pdfkit@0.20.2 socket.io@4.8.4 @sentry/node@11.10.0 winston-loki@6.1.7` (um por vez; testar); ioredis/openai/nest-winston/baileys em PRs separados | Baixo-medio |
| P2-5 | Playwright | `npm --prefix tests-e2e install -D @playwright/test@1.64.1` | Baixo/Baixo |
| P2-6 | Postgres 16 -> 17/18 (EOL PG16 so em 2028-11) e Redis 7.4 -> 8.x | planejar janela; imagens `postgres:17-alpine` / `redis:8-alpine` apos teste de restore (`scripts/backup/restore-test.sh`) | Medio/Medio |
| P2-7 | Fixar imagens `:latest`/sem tag (prometheus, grafana, loki, watchtower, uptime-kuma, freescout) e considerar digest | editar compose | Baixo/Baixo |
| P2-8 | Adicionar gate de seguranca no CI | passo `npm audit --omit=dev --audit-level=high` em `ci.yml` (hoje inexistente) | Baixo/Baixo |
| P2-9 | Visuais: framer-motion, lucide-react, tailwind-merge/tailwind 4, typescript 7 | PRs isolados, depois do Next 16 | Medio/Baixo |

## 8. Resumo

- Producao: 44 vulnerabilidades (1 critical, 33 high). A raiz do critical e o Next 14.2.35, sem patch na linha 14.
- 27 dos 44 vem de `jimp`, que nao e usado; `npm uninstall jimp` resolve.
- Corrigiveis sem major: fastify 5.12.7, multer 2.5.0, nodemailer 10.3.1, zod 4.6.7, class-validator 0.14.4, express/body-parser, vitest 4.1.12.
- Sem correcao disponivel: `uuid` via exceljs e bull (risco real baixo), `js-yaml` via swagger (parcial).
- Node 20 ainda aparece em 5 `FROM` de `infra/` (EOL desde 2026-04-30).
- Postgres 16.15, Redis 7.4.12, Node 24.22.2 e ClamAV 1.5.4 estao suportados e as tags usadas sao as recomendadas.
- Nenhuma action esta fixada por SHA; 8 de 9 estao 1 a 3 majors atras.
- Nao foi possivel verificar: guia oficial do Prisma 7, release notes do Next 15/16, ioredis 6, openai 7, nginx 1.27 e notas das actions (hosts bloqueados ou nao consultados).
