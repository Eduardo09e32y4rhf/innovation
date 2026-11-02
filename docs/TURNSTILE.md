# Cloudflare Turnstile (captcha gratuito)

Protege contra robos: login, cadastro/trial de empresa, esqueci-senha, conta de candidato (cadastro, login, esqueci-senha) e candidatura publica (vaga externa e vaga interna). Funciona sem colocar o site atras do proxy da Cloudflare. **Desligado por padrao**: sem as chaves nada muda.

## 1. Criar o widget (gratis)
1. Painel Cloudflare > **Turnstile** > **Add widget** (nao precisa trocar o DNS).
2. Nome livre; em **Hostname** adicione o dominio do site (ex.: `innovation.com.br`); modo **Managed**.
3. Copie a **Site Key** (publica) e a **Secret Key** (privada).

## 2. Variaveis no `.env` da VPS
```
TURNSTILE_SECRET_KEY=<secret key>              # API: liga a validacao
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>      # Web: exibe o widget (lida no BUILD)
```
- `NEXT_PUBLIC_*` e embutida no build do web: refaca o build/imagem do web apos definir.
- Reinicie a API. Defina as duas juntas; so a secret sem a site key bloqueia os formularios (token ausente = 400).
- Opcionais: nao ha validacao de obrigatoriedade em `env.validation.ts`.

## 3. Comportamento
- Token em `x-turnstile-token` (header) ou `turnstileToken` (corpo). Token invalido/ausente = **400** em portugues.
- Falha de rede, timeout (5s), HTTP 5xx da Cloudflare ou secret invalida: depende de `TURNSTILE_FAIL_MODE` (SEG-10):
  - `open` (padrao em desenvolvimento e em producao que ainda nao optou): deixa passar e registra **erro** no log em cada ocorrencia (alerta).
  - `closed`: responde **503** "Verificacao anti-robo indisponivel..." e registra erro no log. Token ausente/invalido continua **400**.
  - Sem `TURNSTILE_FAIL_MODE`, o modo vira `closed` automaticamente apenas quando `NODE_ENV=production`, `TURNSTILE_SECRET_KEY` esta definida **e** `TURNSTILE_ENFORCE=true`. `TURNSTILE_FAIL_MODE` explicito sempre vence.
  - Recomendacao: validar a chave em staging (secret/site key corretas) antes de ligar `TURNSTILE_ENFORCE=true`; chave trocada em `closed` derruba login e cadastro com 503.
  - Pendente: o repasse de `TURNSTILE_FAIL_MODE` e `TURNSTILE_ENFORCE` no `docker-compose.prod.yml`/`.env.example` (grupo de infra) para chegarem ao container.
- Nao ha CSP configurado hoje no projeto; se for adicionar, libere `https://challenges.cloudflare.com` em `script-src`, `frame-src` e `connect-src`.

## 4. Como testar
- Chaves de teste da Cloudflare: site `1x00000000000000000000AA` (sempre passa), `2x00000000000000000000AB` (sempre bloqueia); secret `1x0000000000000000000000000000000AA` (passa) ou `2x0000000000000000000000000000000AA` (falha).
- Com as chaves definidas, abra `/login`: o widget aparece acima do botao Entrar. Via curl sem token: `curl -i -X POST $API/auth/login -H 'content-type: application/json' -d '{"email":"a@b.com","password":"x"}'` deve retornar 400 "Confirme que voce nao e um robo...".
- Sem as chaves, o formulario nao mostra widget e o login funciona como antes.
- Testes automatizados: `npx vitest run apps/api/src/common/turnstile`.

## Importante: a chave pública do site é gravada no build (GitHub)
As imagens são construídas pelo GitHub (workflow "Imagens Docker") e a VPS só as baixa. Por isso `NEXT_PUBLIC_TURNSTILE_SITE_KEY` **não adianta ficar só no `.env` da VPS**: crie-a como **Variável** do repositório (Settings > Secrets and variables > Actions > Variables) e rode o workflow de novo. A chave secreta (`TURNSTILE_SECRET_KEY`) fica no `.env` da VPS.
