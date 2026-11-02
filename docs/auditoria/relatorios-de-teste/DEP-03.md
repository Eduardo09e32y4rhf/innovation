# DEP-03 - Correcoes do mesmo major (producao)

## Problema
`npm audit --omit=dev` (apos DEP-01): 15 vulnerabilidades (4 altas). Pacotes com correcao no mesmo major: fastify, @fastify/*, multer, nodemailer, express, body-parser, qs, fast-uri, zod, class-validator, js-yaml.

## Documentacao
- Avisos GHSA via `npm audit` e `npm view`: VERIFICADO.
- Notas de versao no GitHub (fastify etc.): NAO VERIFICADO (GitHub bloqueado para repositorios externos nesta sessao). `nodemailer` 10.2.1/10.3.0/10.3.1: CHANGELOG.md do pacote lido (VERIFICADO): so correcoes (stripComments, Content-ID) e a opcao nova `otp`; sem quebra.
- Todas as atualizacoes sao patch/minor dentro do mesmo major; a suite completa foi rodada por grupo.

## Grupos (todos verdes: tsc api, typecheck web, vitest 270 arquivos / 2984 testes + 155 expected fail, igual ao antes)
1. fastify 5.12.5->5.12.7, @fastify/static 10.1.6->10.1.8, @fastify/cookie 11.1.1->11.1.5, @fastify/helmet 13.1.0->13.2.0, @fastify/multipart 10.1.0->10.1.6.
2. multer 2.4.0->2.5.0, nodemailer 10.1.0->10.3.1, express ^5.1.0->5.3.0 (direto no api).
3. class-validator 0.14.1->0.14.4 (0.15.x nao adotado: novo minor 0.x pode quebrar), zod 4.4.3->4.6.7 (raiz, api, web).
4. body-parser 2.3.0->2.4.0, qs 6.16.0->6.17.1 (`npm update`).
5. `overrides` no package.json raiz (versoes fixadas pelo `@nestjs/platform-express` e outros que o `npm update` nao move):
   - `multer: 2.5.0` (platform-express fixa 2.4.0; o multer e usado pelo hub e suporte via `FileInterceptor`; decisao de remover e do SEG-01).
   - `@fastify/ajv-compiler` e `fast-json-stringify`: `fast-uri 4.2.3` (faixa vulneravel 4.0.0-4.2.2; a 3.x usada pelo ajv nao e afetada).
   - `@nestjs/swagger`: `js-yaml 5.5.0` (faixa vulneravel 5.0.0-5.4.0).
   - `baseline-browser-mapping 2.11.34` (dev/browserslist).
6. `zod@4.6.7` tambem no package.json da raiz (hoist exigido pelo lint do web; ver DEP-01).
Nota: `express` 5.3.0 e direto; `@nestjs/platform-express` mantem seu express 5.2.1 aninhado (versao do proprio Nest, sem override).

## Resultado
- `npm audit --omit=dev`: 15 (apos DEP-01) -> 4 moderadas, 0 altas, 0 criticas. Sobram `uuid` via `bull` e `exceljs` (sem correcao sem trocar o pacote; DEP-02/P1).
- `npm audit` (completo): ver DEP-04.
- Observacoes: `package-lock.json` ja tinha entradas sem `resolved/integrity` (347 antes, 253 agora); nao e regressao. O npm local e 10.9.4/Node 22 (o repo pede Node 24/npm 11): conferir o lock com `npm ci` em Node 24 no CI.

## Riscos / teste manual
Envio de e-mail real (nodemailer: reset de senha, convites), upload de arquivos (multer/multipart), cookies de sessao (@fastify/cookie), cabecalhos helmet, validacao de DTO (class-validator), Swagger UI (js-yaml 5.5.0).
