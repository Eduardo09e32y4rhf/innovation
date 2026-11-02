# SEG-headers: cabecalhos de seguranca do web (Onda 1)

Data: 2026-10-29. Branch: claude/fervent-maxwell-bbccbm. Arquivo alterado: `apps/web/next.config.js` (`headers()`).

## Metodo
1. Teste que falha: `tests/unit/web/security-headers.spec.ts` (6 de 8 falharam antes da correcao).
2. Documentacao: nextjs.org e owasp.org estao bloqueados na rede da sessao (ENOTFOUND). Nao existe `node_modules/next/dist/docs` (Next 14.2.35).
   - NAO VERIFICADO online: guia de CSP, referencia de `headers()` e OWASP Secure Headers (valores seguem o conhecimento previo dessas fontes). Liberar nextjs.org e owasp.org na rede da sessao para conferir.
   - VERIFICADO no codigo do Next 14.2.35: `dist/lib/load-custom-routes.js` valida `headers` (array nao vazio de `{key,value}`); o comportamento real foi confirmado com `next start` (abaixo).
3. Correcao em `headers()`. 4. Revisao: a regra `/(.*)` cobre paginas, `/_next/static` e `public/`; nao define Cache-Control, entao o `immutable` do Next e as regras antigas permanecem (confirmado no curl).

## Decisoes
- Permissions-Policy `camera=(), microphone=(), geolocation=(self), payment=()`: o codigo usa `navigator.geolocation` (punch-widget, models-view, privacy-consent-gate); camera so por `<input capture>` (nativo do SO); nao ha getUserMedia nem PaymentRequest.
- CSP enforcing (seguro): `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`.
- CSP completa em **Report-Only** (script-src/style-src etc.): o App Router injeta scripts inline e o `layout.tsx` tem 2 `<script>` inline, entao sem nonce e preciso `'unsafe-inline'`. Nonce exigiria middleware e deixaria todas as paginas dinamicas. Promover a enforcing so depois de abrir o site em navegador e ver zero violacoes no console (login com Turnstile, /carreiras, ponto, cartaz de vagas, PDFs).
- Liberado: `challenges.cloudflare.com` (script/frame/connect), Google Fonts (cartaz e PDF), `data:`/`blob:` (QR Pix/MFA, previas), `https:` em img-src (logos/avatares), origem absoluta de `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_CDN_URL` quando existirem. `'unsafe-eval'` so em desenvolvimento. Links externos (OpenStreetMap, wa.me, Jitsi, Asaas) sao `<a>`, sem necessidade de liberacao.
- HSTS apenas com NODE_ENV=production.

## Testes
- `npx vitest run tests/unit tests/security tests/contract`: 57 arquivos, 572 passaram (3 expected fail preexistentes).
- `npm run typecheck:web`: ok. `NODE_OPTIONS=--max-old-space-size=3072 npm run build:web`: ok.

## curl -I real (`next start -p 3917`, build de producao)
```
=== /
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; media-src 'self' blob: data:; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
=== /login
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; media-src 'self' blob: data:; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
=== /carreiras
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; media-src 'self' blob: data:; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
=== /_next/static/chunks/1004-248e82e7835f0602.js
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; media-src 'self' blob: data:; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
Cache-Control: public, max-age=31536000, immutable
=== /favicon-innovation.svg
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; media-src 'self' blob: data:; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```
Os 5 cabecalhos de seguranca e as duas CSPs aparecem nas 5 rotas; Cache-Control preservado (no-store nas paginas, immutable em /_next/static, 1 dia em public/).

## Pendente
- Validar a CSP Report-Only em navegador e promover a enforcing.
- Confirmar no nginx real do host que nao ha `add_header` duplicado (ver `docs/DEPLOY-VPS.md`).
