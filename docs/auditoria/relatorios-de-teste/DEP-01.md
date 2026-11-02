# DEP-01 - Next 14.2.35 -> 16.4.3

## Problema
`apps/web` usava Next 14.2.35 (linha sem patches), `npm audit --omit=dev`: `next` critical (16 vulnerabilidades em producao, 1 critica).

## Documentacao
- Guia oficial do Next 16 (copia empacotada em `apps/web/node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`). VERIFICADO. nextjs.org nao resolve neste ambiente (ENOTFOUND).
- Regras conferidas e efeito neste codigo:
  - Node >= 20.9: ok (repo exige Node 24).
  - Turbopack padrao no `build`/`dev`: nao ha config `webpack` no `next.config.js`; build passou com Turbopack.
  - APIs de requisicao assincronas (`params`, `searchParams`, `cookies()`, `headers()`): codemod ja aplicado na branch `chore/atualiza-next` (35 arquivos). Reconferido: nenhuma pagina/layout novo com acesso sincrono (restantes `params.x` sao `useParams()` em client components). Nenhum `cookies()/headers()` sem await.
  - `middleware` -> `proxy`: nao existe middleware no web, nada a migrar.
  - `next lint` removido: script `lint` virou `eslint .` com `eslint.config.mjs` (flat config, ESLint 9.39.5). `eslint.ignoreDuringBuilds` removido do config (opcao inexistente no 16).
  - next/image: `images.unoptimized: true` mantido (otimizador desligado; defaults novos de minimumCacheTTL/qualities nao se aplicam).
  - `experimental.outputFileTracingRoot` -> `outputFileTracingRoot` (nivel raiz).
  - React: o Next 16 aceita peer `react ^18.2 || ^19`; mantido React 18.3.1 (menor risco). Build e paginas funcionam. NAO migrado para React 19.
  - `headers()` do next.config (SEG-07) e CSP Report-Only: inalterados.

## Alteracoes
Merge de `origin/chore/atualiza-next` (3 commits) sobre `origin/claude/fervent-maxwell-bbccbm`. Unico conflito: `package-lock.json` (regenerado com `npm install`). Acrescentado `zod@4.4.3` nas dependencias da raiz: sem isso o npm deixa `zod` so aninhado em apps/web e apps/api e o `zod-validation-error` hoisted na raiz (peer do eslint-plugin-react-hooks 7) nao resolve `zod`, quebrando `eslint .`.
Arquivos: apps/web/package.json, package.json, package-lock.json, apps/web/next.config.js, apps/web/eslint.config.mjs (novo; `.eslintrc.json` removido), 35 paginas/layouts (params async), tsconfig.

## Comandos e resultado (reais)
- `npm run typecheck:web`: 0 erros.
- `npm run lint:web`: 0 erros, 195 avisos (regras novas do React Compiler rebaixadas a `warn` no eslint.config.mjs; nao exigem refatoracao agora).
- `NODE_OPTIONS=--max-old-space-size=3072 npm run build:web`: sucesso (Turbopack), todas as rotas listadas.
- `node .next/standalone/apps/web/server.js` (como o Dockerfile; static e public copiados), NODE_ENV=production:
  - `/`, `/login`, `/carreiras`, `/carreiras/<uuid>/<uuid>`, `/acme/dashboard`: HTTP 200.
  - `/acme/dashboard`: devolve 200 (o redirecionamento para `/login` e feito no cliente, comportamento ja existente; nao e redirect HTTP).
  - Cabecalhos nas paginas: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` (producao), `Content-Security-Policy` (enforcing) e `Content-Security-Policy-Report-Only`, `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.
  - `/_next/static/chunks/*.js`: 200, `Cache-Control: public, max-age=31536000, immutable`.
  - `next start` avisa que nao funciona com `output: standalone` (ja era assim; o Dockerfile usa `node apps/web/server.js`).
- `npx vitest run tests/unit/web` (inclui security-headers.spec.ts): 25 arquivos, 310 testes passam (apos `npm run prisma:generate`; sem ele `job-library.spec.ts` falha por `UserRole` nao gerado).
- `npm audit --omit=dev`: antes 16 (1 critica) -> depois 15 (0 criticas, 4 altas); `next` saiu da lista.

## Riscos restantes / teste manual em navegador
Nao testado em navegador: login e sessao (cookies), portal do funcionario, carreiras (candidatura, agendar, acompanhar), contabilidade, cupons, pagamento (Turnstile, Asaas/Mercado Pago), ponto com geolocalizacao, console para violacoes da CSP Report-Only. Hidratacao com Turbopack e framer-motion/lucide com React 18 so se confirma no navegador. Playwright (`test:e2e`) nao executado aqui.
