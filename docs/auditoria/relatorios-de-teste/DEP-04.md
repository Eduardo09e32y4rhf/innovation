# DEP-04 - Ferramentas de desenvolvimento (vitest, vite e transitivos)

## Problema
`npm audit` (completo) apos DEP-03: 12 vulnerabilidades (3 baixas, 5 moderadas, 4 altas). Itens de dev: `vitest`/`@vitest/mocker` (<=4.1.11), `vite` 8.0.0-8.1.5 (alta; launch-editor, middleware, fs.allow), `browserslist` <=4.28.6 (alta), `postcss-selector-parser` <6.1.5, `baseline-browser-mapping` <2.11.0.

## Documentacao
Avisos GHSA e versoes via `npm audit`/`npm view` (VERIFICADO). Notas de versao no GitHub: NAO VERIFICADO (bloqueado). Regra: atualizar so dentro do major (vitest 4.x, vite 8.x, browserslist 4.x, postcss-selector-parser 6.x).

## Alteracoes
- `vitest` e `@vitest/coverage-v8`: 4.1.10 -> 4.1.12 (o 5.0.5 e outro major: nao adotado). `vite` 8.1.5 -> 8.3.5 (mesmo major, via `npm update`).
- `overrides` na raiz: `browserslist 4.29.5` (tambem via autoprefixer/webpack do Nest CLI), `baseline-browser-mapping 2.11.34` (o Next 16 aceita ^2.9.19). `postcss-selector-parser` subiu para 6.1.5 apenas regenerando as entradas do lock (sem override).
- Tentado e revertido: override `deepmerge-ts 8.0.2` (transitivo do `prisma`/`@prisma/config` 6.19.3, alta). E um salto de major interno do CLI do Prisma e o npm nao aplicou; a correcao correta e o Prisma 7 (P1-4, branch propria).

## Resultado (comandos reais)
- `npx vitest run`: 270 arquivos, 2984 testes passam, 155 expected fail (igual ao antes). `npx tsc --noEmit -p apps/api`: 0 erros. `typecheck:web`: 0 erros. `lint:web`: 0 erros, 195 avisos. `build:web`: sucesso (apos limpar `.next`; um cache velho gerou erro falso de modulo) e o standalone sobe.
- `npm audit` completo: 12 -> 9 (3 baixas, 3 moderadas, 3 altas). Restam: `prisma`/`@prisma/config`/`deepmerge-ts` (altas, dev-CLI, Prisma 7), `deepmerge` e `fork-ts-checker-webpack-plugin` (baixas, `@nestjs/cli`, fix e major do CLI), `uuid`/`bull`/`exceljs` (moderadas, sem correcao sem trocar de pacote).
- `npm audit --omit=dev`: 3 moderadas (uuid via bull e exceljs). Historico em producao: 16 (1 critica) no inicio -> 15 apos DEP-01 -> 4 apos DEP-03 -> 3 apos DEP-04.

## Riscos
Cobertura (`test:coverage`) nao reexecutada. O lock foi editado em entradas aninhadas (stale) para o npm 10 resolver os overrides: validar com `npm ci` em Node 24/npm 11 no CI.
