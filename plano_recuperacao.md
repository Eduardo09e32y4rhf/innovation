# PLANO ÚNICO DE RECUPERAÇÃO — INNOVATION RH

Use este documento como roteiro principal no Codex.

# REGRA GERAL DE EXECUÇÃO

Execute somente **um bloco por vez**.

No começo de cada bloco, envie ao Codex:

Leia o bloco atual deste plano e trabalhe somente nele.

Antes de alterar qualquer arquivo:

1. Leia o código atual dos arquivos envolvidos.
2. Consulte o histórico Git quando o bloco citar commits antigos.
3. Não restaure arquivos antigos inteiros sem revisar compatibilidade.
4. Recupere somente funcionalidades e trechos válidos.
5. Não altere módulos que não pertençam ao bloco atual.
6. Preserve migrations e dados existentes.
7. Não execute migrations destrutivas em produção.
8. Não utilize mocks, dados fictícios, TODOs que simulem conclusão ou valores fixos.
9. Não esconda erros de TypeScript, ESLint, testes ou build.
10. Não faça mudanças visuais junto com mudanças financeiras ou de autenticação, salvo quando o bloco exigir.
11. Não faça commit automaticamente sem mostrar o que mudou.
12. Pare ao concluir o bloco.

Ao terminar, informe obrigatoriamente:

- diagnóstico encontrado;
- arquivos lidos;
- arquivos criados;
- arquivos alterados;
- arquivos removidos;
- migrations criadas;
- alterações de banco;
- testes adicionados;
- testes executados;
- resultado dos testes;
- erros restantes;
- riscos encontrados;
- instruções manuais necessárias;
- commit sugerido.

Não avance para o próximo bloco.

---

# BLOCO 00 — BACKUP, SEGURANÇA E CONGELAMENTO

## Objetivo

Proteger o código, banco de dados, credenciais e histórico antes de iniciar a recuperação.

## Git

Executar:

```bash
git checkout main
git pull origin main

git status
git log --oneline -30

git tag backup-before-recovery-300
git push origin backup-before-recovery-300

git checkout -b recovery/300-commits
````

Confirmar:

```bash
git branch --show-current
git status
```

Resultado esperado:

```text
Branch atual: recovery/300-commits
Working tree limpa
Tag de backup enviada ao GitHub
```

## Banco de dados

Criar backup:

```bash
pg_dump "$DATABASE_URL" > backup_before_recovery.sql
```

Confirmar que o arquivo não está vazio:

```bash
ls -lh backup_before_recovery.sql
```

Não adicionar esse backup ao Git.

Adicionar ao `.gitignore`, caso necessário:

```gitignore
backup_*.sql
*.dump
*.backup
```

## Credenciais que devem ser rotacionadas

Rotacionar imediatamente:

```text
JWT_SECRET
DEV_PASSWORD
ADMIN_PASSWORD
ASAAS_API_KEY, caso tenha aparecido no código ou histórico
ASAAS_WEBHOOK_TOKEN
ASAAS_WEBHOOK_SECRET
TRIAL_DOCUMENT_HASH_SECRET
senhas usadas em testes E2E
senhas de banco expostas
segredos presentes em scripts antigos
```

## Buscar segredos no código

Executar:

```bash
git grep -n "password"
git grep -n "senha"
git grep -n "ASAAS_API_KEY"
git grep -n "JWT_SECRET"
git grep -n "WEBHOOK_SECRET"
git grep -n "SECRET_KEY"
git grep -n "eduardo998468"
git grep -n "Admin123"
git grep -n "Teste@123"
git grep -n "575031"
```

Classificar cada resultado:

```text
variável de ambiente segura;
exemplo genérico;
senha real;
credencial de teste;
segredo exposto;
documentação antiga.
```

Remover senhas reais do estado atual.

## GitHub

Ativar:

```text
Proteção da branch main
Pull request obrigatório
Required status checks
Bloqueio de force push
Bloqueio de exclusão da main
Dependabot
CodeQL
Secret scanning
Push protection
```

## Critério de conclusão

```text
Backup Git criado
Backup do banco criado
Credenciais expostas rotacionadas
Branch de recuperação criada
Main protegida
Nenhum trabalho direto na main
```

## Commit

```bash
git commit --allow-empty -m "chore: inicia recuperacao auditada dos 300 commits"
```

---

# BLOCO 01 — REMOVER ARQUITETURA LEGADA

## Objetivo

Manter apenas a arquitetura oficial atual:

```text
Frontend: Next.js
Backend: NestJS
Banco: PostgreSQL + Prisma
Cache e filas: Redis
Cobrança: Asaas
Proxy: Caddy
Deploy: Docker Compose
Autenticação: JWT
```

## Remover arquivos obsoletos

Remover:

```text
scripts/finalizar_producao.ps1
scripts/deploy_vps_completo.sh
scripts/tools/migrar_para_blocos.ps1
scripts/tools/reorganizar_blocos.ps1
docs/RESUMO_PROJETO/RESUMO_INNOVATION_IA.md
docs/metadata/.env.example
apps/web/package-lock.json
apps/api/package-lock.json
```

Antes de remover cada arquivo:

```text
confirmar que não é chamado pelo package.json;
confirmar que não é chamado pela CI;
confirmar que não é usado pelo deploy atual.
```

## Remover scripts inexistentes do package.json raiz

Remover:

```text
dev:canvas
dev:canvas:minimal
dev:canvas:frontend
dev:canvas:backend
build:canvas
```

Motivo:

```text
o projeto oficial possui apenas os workspaces apps/web e apps/api;
o script start_agent_canvas.ps1 não existe;
esses comandos confundem manutenção e deploy.
```

## Manter

```text
package-lock.json da raiz
tests-e2e/package-lock.json
docker-compose.prod.yml
infra/Caddyfile
apps/api/Dockerfile
apps/web/Dockerfile
apps/api
apps/web
tests-e2e
```

## Criar decisão de arquitetura

Criar:

```text
docs/architecture/ADR-001-current-stack.md
```

Conteúdo:

```markdown
# ADR-001 — Arquitetura oficial atual

## Stack aprovada

- Frontend: Next.js 14 com App Router
- Backend: NestJS
- Linguagem: TypeScript
- Banco: PostgreSQL
- ORM: Prisma
- Cache e filas: Redis
- Cobrança: Asaas
- Autenticação: JWT
- WhatsApp: sessão global administrada exclusivamente pelo DEV
- Deploy: Docker Compose na VPS
- Proxy e TLS: Caddy

## Arquiteturas removidas

- FastAPI
- Python
- Flutter
- Supabase Auth
- Mercado Pago
- diretório backend antigo
- diretório frontend antigo
- Innovation.ia antigo
- deploy antigo via Vercel
- scripts antigos de Uvicorn/Gunicorn

## Regra

Nenhuma arquitetura removida poderá retornar sem uma nova ADR aprovada.
```

## Banco de dados antigo

Não excluir tabelas antigas automaticamente.

Para cada tabela suspeita:

```sql
SELECT COUNT(*) FROM nome_da_tabela;
```

Verificar:

```text
quantidade de registros;
chaves estrangeiras;
uso em repositories;
uso em services;
uso em controllers;
uso no frontend;
migrations relacionadas.
```

Somente remover após:

```text
backup;
análise;
migration separada;
teste em staging;
teste de rollback.
```

## Busca final

```bash
git grep -n "FastAPI"
git grep -n "uvicorn"
git grep -n "gunicorn"
git grep -n "Supabase"
git grep -n "Mercado Pago"
git grep -n "backend/"
git grep -n "frontend/"
git grep -n "Innovation.ia"
git grep -n "langchain_google"
git grep -n "boto3"
```

Resultados operacionais devem ser removidos.

Documentos históricos devem ser claramente marcados como arquivados ou removidos.

## Validação

```bash
npm ci
npm run build:api
npm run build:web
```

## Commit

```bash
git add .
git commit -m "chore: remove arquitetura legada e scripts obsoletos"
```

---

# BLOCO 02 — BUILD, TYPESCRIPT, ESLINT, PRISMA E CI

## Objetivo

Impedir que código quebrado seja enviado para produção.

## Arquivos

```text
apps/web/next.config.js
package.json
apps/api/package.json
apps/web/package.json
.github/workflows/ci-cd.yml
scripts/workspace-lint.cjs
```

## Next.js

Alterar para:

```js
typescript: {
  ignoreBuildErrors: false,
},

eslint: {
  ignoreDuringBuilds: false,
},
```

Não esconder nenhum erro.

## Package.json raiz

Criar scripts reais:

```json
{
  "scripts": {
    "dev": "npm run dev:web",
    "dev:web": "npm --prefix apps/web run dev",
    "dev:api": "npm --prefix apps/api run dev",

    "prisma:format": "npx prisma format --schema apps/api/prisma/schema.prisma",
    "prisma:validate": "npx prisma validate --schema apps/api/prisma/schema.prisma",
    "prisma:generate": "npx prisma generate --schema apps/api/prisma/schema.prisma",

    "lint:web": "npm --prefix apps/web run lint",
    "typecheck:api": "npm --prefix apps/api run build",
    "typecheck:web": "npm --prefix apps/web run typecheck",

    "test:api": "npm --prefix apps/api test",
    "test:e2e": "npm --prefix tests-e2e test",

    "build:api": "npm --prefix apps/api run build",
    "build:web": "npm --prefix apps/web run build",

    "validate": "npm run prisma:validate && npm run prisma:generate && npm run lint:web && npm run typecheck:api && npm run typecheck:web",
    "build": "npm run validate && npm run build:api && npm run build:web"
  }
}
```

## workspace-lint.cjs

O script atual só verifica se arquivos existem.

Renomear para algo coerente:

```text
scripts/workspace-foundation-check.cjs
```

Novo comando:

```json
"check:workspace": "node scripts/workspace-foundation-check.cjs"
```

Não chamá-lo de typecheck.

## CI obrigatória

Fluxo:

```yaml
name: Innovation RH CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  validate:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: innovation
          POSTGRES_PASSWORD: innovation
          POSTGRES_DB: innovation_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U innovation"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    env:
      DATABASE_URL: postgresql://innovation:innovation@localhost:5432/innovation_test?schema=public
      REDIS_URL: redis://localhost:6379
      JWT_SECRET: ci-only-secret
      ALLOWED_ORIGINS: http://localhost:3000

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
          cache-dependency-path: package-lock.json

      - run: npm ci

      - run: npm run check:workspace
      - run: npm run prisma:validate
      - run: npm run prisma:generate
      - run: npm run lint:web
      - run: npm run typecheck:api
      - run: npm run typecheck:web
      - run: npm run test:api
      - run: npm run build:api
      - run: npm run build:web
```

E2E completo pode ficar em job separado inicialmente.

## Não fazer

```text
não usar continue-on-error;
não usar || true;
não ignorar TypeScript;
não ignorar ESLint;
não publicar após falha;
não executar migration de produção na CI.
```

## Corrigir licença

No `package.json` raiz:

```json
"license": "UNLICENSED"
```

Motivo:

```text
o LICENSE declara software proprietário;
MIT no package.json contradiz o LICENSE.
```

## Critério de conclusão

```bash
npm ci
npm run check:workspace
npm run prisma:validate
npm run prisma:generate
npm run lint:web
npm run typecheck:api
npm run typecheck:web
npm run build
```

Todos terminam com código 0.

## Commit

```bash
git add .
git commit -m "ci: transforma build typecheck lint e prisma em gates obrigatorios"
```

---

# BLOCO 03 — AUTENTICAÇÃO, LOGIN, SESSÃO E TENANT

## Objetivo

Corrigir login, contexto da empresa, tenant, sessão normal e Ghost Mode.

## Arquivos

```text
apps/api/src/modules/auth/auth.controller.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/auth.repository.ts
apps/api/src/common/types/auth.types.ts

apps/web/app/contexts/AuthContext.tsx
apps/web/app/lib/auth-session.ts
apps/web/app/lib/api.ts
apps/web/app/login/page.tsx
apps/web/app/components/ProtectedRoute.tsx
```

## Contrato de login

O backend deve retornar:

```ts
interface LoginResponse {
  access_token: string;

  user: {
    sub: string;
    email: string;
    name: string;
    role:
      | 'DEV'
      | 'COMERCIAL'
      | 'ADMIN'
      | 'RH'
      | 'GESTOR'
      | 'FUNCIONARIO'
      | 'CONSULTA';

    companyId: string;
    ghostMode?: boolean;
  };

  company: {
    id: string;
    name: string;
    slug: string;
    status: string;
    billingStatus: string;
    isActive: boolean;
  };
}
```

## Backend

O login precisa buscar a empresa real.

Nunca retornar apenas:

```text
companyId
```

O frontend não deve precisar adivinhar nome ou slug.

## Remover

```text
name: "Innovation RH System"
slug criado no frontend a partir de nome fixo
e-mail DEV hardcoded
empresa falsa
```

## Timeout

Aumentar de:

```ts
AbortSignal.timeout(3000)
```

para:

```ts
AbortSignal.timeout(15000)
```

Preferencialmente usar o mesmo cliente HTTP central.

## Mensagens de erro

Não transformar qualquer 403/409 em:

```text
Procure o administrador do sistema.
```

Criar erros com código.

Exemplo backend:

```ts
throw new ForbiddenException({
  code: 'COMPANY_BILLING_BLOCKED',
  message: 'A assinatura da empresa precisa ser regularizada.',
});
```

Frontend:

```ts
switch (error.code) {
  case 'COMPANY_BILLING_BLOCKED':
    // ADMIN → pagamento
    // equipe → mensagem neutra
    break;

  case 'COMPANY_DOCUMENT_EXISTS':
    // CNPJ duplicado
    break;

  case 'EMAIL_ALREADY_EXISTS':
    // e-mail duplicado
    break;
}
```

## Sessão normal

Salvar em:

```text
localStorage
```

Conteúdo:

```ts
{
  token,
  user,
  company,
  ghostMode: false
}
```

## Ghost Mode

Salvar em:

```text
sessionStorage
```

Conteúdo:

```ts
{
  token,
  user,
  company,
  ghostMode: true
}
```

Regras:

```text
sessão Ghost pertence somente à aba;
sessão Ghost nunca substitui a sessão normal;
logout Ghost apaga somente sessionStorage;
logout normal apaga somente a sessão normal;
sessionStorage Ghost só tem prioridade quando ghostMode === true.
```

## Tela de login

Exibir:

```text
Entrar
Esqueci minha senha
Criar minha empresa
Voltar para o site
```

Adicionar:

```tsx
<Link href="/cadastro">
  Criar minha empresa
</Link>
```

Adicionar:

```tsx
<Link href="/">
  Voltar para o site
</Link>
```

## Redirecionamento

Usar:

```text
company.slug
```

Fallback temporário:

```text
company.id
```

Não gerar slug a partir de nome fixo.

## ADMIN inadimplente

Login deve funcionar.

Após login:

```text
redirecionar para /{tenant}/fatura-pendente?autoCheckout=1
```

## Equipe inadimplente

RH, GESTOR, FUNCIONARIO e CONSULTA recebem:

```text
O acesso da sua empresa está temporariamente indisponível
por uma pendência na assinatura.

A regularização está disponível ao administrador da empresa.
```

Não oferecer pagamento para equipe.

## Testes obrigatórios

```text
DEV
COMERCIAL
ADMIN ativo
ADMIN PENDING_PAYMENT
ADMIN PAST_DUE
ADMIN SUSPENDED
RH ativo
RH bloqueado
GESTOR
FUNCIONARIO
CONSULTA
Ghost Mode
logout normal
logout Ghost
refresh
duas abas
sessão expirada
empresa inexistente
```

## Commit

```bash
git add .
git commit -m "fix(auth): estabiliza login tenant e sessoes"
```

---

# BLOCO 04 — CADASTRO PÚBLICO PELA LANDING

## Objetivo

Permitir que o cliente crie a empresa e inicie pagamento sem intervenção do DEV.

## Arquivos

```text
apps/web/app/page.tsx
apps/web/app/cadastro/page.tsx
apps/web/app/_components/pricing-section.tsx
apps/web/app/contexts/AuthContext.tsx
apps/web/app/lib/api.ts

apps/api/src/modules/auth/dto/register-company.dto.ts
apps/api/src/modules/auth/auth.controller.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/auth.repository.ts
```

## DTO

Adicionar:

```ts
planId: string;
seatQuantity: number;
couponCode?: string;
```

Validar:

```text
planId obrigatório;
plano existente;
plano ativo;
plano não oculto;
seatQuantity inteiro;
seatQuantity >= 1;
seatQuantity dentro do limite técnico;
CNPJ válido;
CNPJ normalizado;
CNPJ único;
e-mail válido;
e-mail único;
senha forte.
```

## Fluxo

```text
Landing
→ cliente escolhe plano
→ seleciona quantidade de usuários
→ informa dados da empresa
→ informa dados do ADMIN
→ POST /auth/register-company
→ backend cria empresa
→ backend cria ADMIN
→ backend configura cobrança
→ backend retorna sessão
→ frontend salva token, usuário e empresa
→ frontend abre tela interna de pagamento
```

## Resposta do cadastro

```ts
interface RegisterCompanyResponse {
  access_token: string;

  user: {
    sub: string;
    email: string;
    name: string;
    role: 'ADMIN';
    companyId: string;
  };

  company: {
    id: string;
    name: string;
    slug: string;
    status: string;
    billingStatus: string;
    isActive: boolean;
  };

  paymentUrl?: string | null;
  billingSetupPending?: boolean;
  trial?: boolean;
  trialEndsAt?: string | null;
}
```

## Redirecionamento

Não fazer:

```ts
window.location.href = response.paymentUrl;
```

Fazer:

```ts
saveAuthSession(response);

router.replace(
  `/${response.company.slug}/fatura-pendente?autoCheckout=1`,
);
```

## Landing page

Corrigir CTAs:

```text
Criar minha empresa → /cadastro
Acessar → /login
Ver planos → #planos
```

Remover texto de teste grátis sem cupom.

## Regra

```text
Sem cupom:
pagamento imediato.

Com cupom válido:
trial de 30 dias.
```

## Critério de conclusão

Cliente consegue:

```text
abrir landing;
escolher plano;
selecionar usuários;
preencher cadastro;
criar empresa;
continuar autenticado;
ir ao pagamento interno;
não precisar do DEV.
```

## Testes

```text
CNPJ válido
CNPJ inválido
CNPJ duplicado
e-mail duplicado
plano inválido
plano inativo
seatQuantity zero
seatQuantity negativo
erro Asaas
erro banco
duplo clique em cadastrar
refresh depois do cadastro
```

## Commit

```bash
git add .
git commit -m "fix(onboarding): conclui cadastro autonomo pela landing"
```

---

# BLOCO 05 — BILLING AUTOMÁTICO E MÁQUINA DE ESTADOS

## Objetivo

Automatizar cobrança inicial, assinatura, inadimplência, bloqueio e liberação.

## Estados oficiais

```text
PENDING_PAYMENT
TRIAL
ACTIVE
PAST_DUE
SUSPENDED
CANCELED
MANUAL_CONTRACT
```

## Regras

### PENDING_PAYMENT

```text
empresa criada;
primeiro pagamento ainda não confirmado;
ADMIN pode acessar somente pagamento;
equipe bloqueada.
```

### TRIAL

```text
empresa liberada por cupom;
sem cobrança imediata;
proposta antes do fim.
```

### ACTIVE

```text
acesso normal;
assinatura regular.
```

### PAST_DUE

```text
mensalidade vencida;
avisos ativos;
período de tolerância.
```

### SUSPENDED

```text
período de tolerância terminou;
equipe bloqueada;
ADMIN somente pagamento.
```

### CANCELED

```text
contrato encerrado;
acesso bloqueado.
```

### MANUAL_CONTRACT

```text
contrato excepcional criado pelo DEV;
não depende do fluxo recorrente padrão.
```

## Arquivos

```text
apps/api/prisma/schema.prisma
apps/api/src/modules/finance/platform-finance.service.ts
apps/api/src/modules/finance/company-billing.controller.ts
apps/api/src/modules/finance/asaas.service.ts
apps/api/src/modules/finance/asaas-webhook.controller.ts
apps/api/src/modules/finance/billing-cron.service.ts
apps/api/src/common/guards/tenant.guard.ts
apps/api/src/modules/auth/auth.service.ts

apps/web/app/[tenant]/fatura-pendente/page.tsx
apps/web/app/components/ProtectedRoute.tsx
apps/web/app/lib/api.ts
```

## Primeiro pagamento

Separar:

```text
Cobrança inicial:
pagamento imediato da contratação.

Assinatura:
renovações futuras.
```

Criar métodos:

```ts
ensureAsaasCustomer()
createInitialCharge()
createRecurringSubscription()
ensureCompanyOnboardingBilling()
```

## Não usar

```text
assinatura vencendo hoje;
procurar cobrança imediatamente;
criar cobrança avulsa de fallback;
```

Esse fluxo pode duplicar cobrança.

## Exemplo mensal

```text
Hoje:
cobrança inicial.

Daqui a 1 mês:
primeira cobrança da assinatura.
```

## Exemplo trimestral

```text
Hoje:
cobrança inicial do período de 3 meses.

Daqui a 3 meses:
nova cobrança da assinatura trimestral.
```

## Resposta financeira única

```ts
interface CompanyBillingResult {
  active: boolean;
  paymentUrl: string | null;

  invoice: PlatformInvoice | null;
  currentInvoice: PlatformInvoice | null;

  company: {
    id: string;
    status: string;
    billingStatus: string;
  };

  plan: PlatformPlan | null;
  subscription: CompanySubscription | null;

  usage: {
    users: number;
    maxUsers: number;
    employees: number;
    maxEmployees: number;
  };
}
```

## Tela fatura-pendente

Restaurar comportamento de:

```text
autoCheckout=1
```

Ao abrir:

```text
consultar status;
verificar se já está ativo;
buscar cobrança atual;
se houver URL, abrir;
se não houver, solicitar checkout;
impedir duas solicitações;
iniciar polling;
```

Mostrar:

```text
Plano
Valor
Vencimento
Status
Pix
Boleto
Abrir pagamento
Já paguei
Atualizar status
```

## Polling

Intervalo:

```text
15 a 30 segundos
```

Ao detectar empresa ativa:

```text
atualizar sessão;
redirecionar ao dashboard;
parar polling.
```

## Cron de inadimplência

Ao suspender:

```ts
{
  status: 'SUSPENDED',
  isActive: false,
  billingStatus: 'PAST_DUE',
  suspensionReason: 'inadimplencia',
}
```

Ao liberar:

```ts
{
  status: 'ACTIVE',
  isActive: true,
  billingStatus: 'ACTIVE',
  suspensionReason: null,
}
```

## TenantGuard

Durante bloqueio:

### DEV

```text
acesso total.
```

### ADMIN

Liberar apenas:

```text
/auth/*
/finance/company/*
/fatura-pendente
logout
dados mínimos de sessão
```

### Equipe

Bloquear.

## Critério de conclusão

```text
cadastro cria cobrança;
não duplica cobrança;
ADMIN consegue pagar;
webhook libera;
equipe volta automaticamente;
fechar navegador não perde cobrança;
login posterior recupera pagamento.
```

## Commit

```bash
git add .
git commit -m "fix(billing): estabiliza cobranca bloqueio e liberacao automatica"
```

---

# BLOCO 06 — WEBHOOK ASAAS IDPOTENTE

## Objetivo

Garantir que eventos repetidos não criem processamento duplicado.

## Criar modelo

```prisma
model AsaasWebhookEvent {
  id             String   @id @default(cuid())
  asaasEventId   String   @unique
  eventType      String
  payload        Json
  status         String
  attempts       Int      @default(0)
  processedAt    DateTime?
  errorMessage   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status])
  @@index([eventType])
  @@index([createdAt])
}
```

## Status

```text
PENDING
PROCESSING
PROCESSED
FAILED
IGNORED
```

## Fluxo do controller

```text
1. Receber webhook.
2. Validar token ou segredo.
3. Extrair event.id.
4. Tentar inserir AsaasWebhookEvent.
5. Se já existir, responder HTTP 200.
6. Enviar para fila.
7. Responder HTTP 200 rapidamente.
```

## Worker

```text
1. Buscar evento PENDING.
2. Marcar PROCESSING.
3. Processar transação.
4. Atualizar cobrança.
5. Atualizar assinatura.
6. Atualizar empresa.
7. Criar notificação.
8. Criar auditoria.
9. Marcar PROCESSED.
```

Em erro:

```text
incrementar attempts;
salvar errorMessage;
marcar FAILED;
permitir retry controlado.
```

## Eventos mínimos

```text
PAYMENT_CREATED
PAYMENT_UPDATED
PAYMENT_OVERDUE
PAYMENT_CONFIRMED
PAYMENT_RECEIVED
PAYMENT_REFUNDED
PAYMENT_DELETED
PAYMENT_CHARGEBACK_REQUESTED
PAYMENT_CHARGEBACK_DISPUTE
INVOICE_AUTHORIZED
INVOICE_CANCELED
INVOICE_ERROR
```

## Regras

### PAYMENT_CREATED

```text
criar ou atualizar PlatformInvoice;
não duplicar por asaasPaymentId;
registrar cobrança local.
```

### PAYMENT_OVERDUE

```text
invoice = OVERDUE;
company.billingStatus = PAST_DUE;
iniciar tolerância;
notificar ADMIN;
WhatsApp global.
```

### PAYMENT_CONFIRMED / RECEIVED

```text
invoice = PAID;
paidAt preenchido;
company ACTIVE;
isActive true;
suspensionReason null;
liberar usuários;
notificar ADMIN.
```

### INVOICE_AUTHORIZED

Salvar:

```text
número;
status fiscal;
data;
PDF;
XML.
```

## Garantias

```text
sem cobrança duplicada;
sem ativação duplicada;
sem aviso duplicado;
sem nota duplicada;
sem travar fila Asaas.
```

## Testes

Enviar duas vezes o mesmo payload.

Resultado esperado:

```text
um AsaasWebhookEvent;
uma atualização da cobrança;
uma liberação;
uma notificação;
HTTP 200 nas duas chamadas.
```

## Commit

```bash
git add .
git commit -m "feat(asaas): adiciona processamento idempotente de webhooks"
```

---

# BLOCO 07 — PLANOS E PREÇO POR USUÁRIO

## Objetivo

Centralizar todos os cálculos financeiros no backend.

## Regras comerciais

```text
Base mensal: R$ 249,99
Usuário por mês: R$ 3,00

Mensal:
1 mês
0% desconto

Trimestral:
3 meses
5% desconto na base

Semestral:
6 meses
8% desconto na base

Anual:
12 meses
10% desconto na base
```

## Fórmulas

```text
Base bruta:
249,99 × meses

Desconto:
aplicado somente na base

Usuários:
3,00 × usuários × meses

Total:
base líquida + usuários
```

## Não usar

```text
maxUsers para cobrar;
preço calculado no frontend;
valor final enviado pelo cliente;
desconto duplicado;
Number/float sem controle de centavos.
```

## PricingService

Usar centavos inteiros.

```ts
export type CommitmentMonths = 1 | 3 | 6 | 12;

const BASE_MONTHLY_CENTS = 24_999;
const USER_MONTHLY_CENTS = 300;

const DISCOUNT_BPS: Record<CommitmentMonths, number> = {
  1: 0,
  3: 500,
  6: 800,
  12: 1000,
};
```

O método deve retornar:

```ts
{
  commitmentMonths,
  seatQuantity,

  baseMonthlyCents,
  userMonthlyCents,

  discountBps,
  discountPercent,

  baseGrossCents,
  baseDiscountCents,
  baseNetCents,
  seatAmountCents,
  totalCents,

  baseGross,
  baseDiscount,
  baseNet,
  seatAmount,
  total
}
```

## Separar licença e limite técnico

Criar preferencialmente:

```prisma
model CompanySubscription {
  id                  String   @id @default(uuid()) @db.Uuid
  companyId           String   @unique @db.Uuid
  planId              String?  @db.Uuid

  status              String
  seatQuantity        Int      @default(1)

  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  nextDueDate         DateTime?

  trialStartedAt      DateTime?
  trialEndsAt         DateTime?

  pricingVersion      String?
  baseMonthlyPrice    Decimal? @db.Decimal(10, 2)
  userMonthlyPrice    Decimal? @db.Decimal(10, 2)
  discountPercent     Decimal? @db.Decimal(5, 2)

  asaasCustomerId     String?
  asaasSubscriptionId String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  company Company       @relation(fields: [companyId], references: [id])
  plan    PlatformPlan? @relation(fields: [planId], references: [id])

  @@index([status])
  @@index([nextDueDate])
  @@index([trialEndsAt])
}
```

## Quote endpoint

Criar:

```http
POST /auth/public-plans/quote
```

Request:

```json
{
  "planId": "uuid",
  "seatQuantity": 10,
  "couponCode": "opcional"
}
```

Response trimestral:

```json
{
  "commitmentMonths": 3,
  "seatQuantity": 10,
  "baseGross": 749.97,
  "baseDiscount": 37.50,
  "baseNet": 712.47,
  "seatAmount": 90.00,
  "total": 802.47
}
```

## Planos no banco

Todos devem possuir:

```text
baseMonthlyPrice = 249.99;
userMonthlyPrice = 3.00;
discountPercent separado;
commitmentMonths;
asaasCycle;
code;
displayOrder;
isRecommended;
pricingVersion;
activeModules.
```

## Ciclos Asaas

```text
MONTHLY
QUARTERLY
SEMIANNUALLY
YEARLY
```

## Seed

Adicionar comando:

```json
"seed:pricing": "tsx prisma/seed-pricing.ts"
```

Planos:

```text
MONTHLY
QUARTERLY
SEMIANNUAL
ANNUAL
```

Não usar:

```text
FREE
BASE
PRO
ENTERPRISE
```

como planos comerciais visíveis.

## Testes

```text
1 usuário
5 usuários
10 usuários
20 usuários
50 usuários

1 mês
3 meses
6 meses
12 meses
```

Valores com 10 usuários:

```text
Mensal: R$ 279,99
Trimestral: R$ 802,47
Semestral: R$ 1.559,94
Anual: R$ 3.059,89
```

## Commit

```bash
git add .
git commit -m "fix(pricing): centraliza precificacao e licencas faturaveis"
```

---

# BLOCO 08 — CUPOM E TESTE DE 30 DIAS

## Objetivo

Permitir teste grátis somente mediante cupom e uma única vez por documento.

## Modelos

```prisma
model PromotionCoupon {
  id              String   @id @default(uuid()) @db.Uuid
  code            String   @unique
  description     String?
  trialDays       Int      @default(30)

  startsAt        DateTime?
  expiresAt       DateTime?

  maxRedemptions  Int?
  redemptionCount Int      @default(0)

  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  redemptions CouponRedemption[]
}

model CouponRedemption {
  id           String   @id @default(uuid()) @db.Uuid
  couponId     String   @db.Uuid
  companyId    String?  @db.Uuid
  documentHash String
  redeemedAt   DateTime @default(now())

  coupon PromotionCoupon @relation(
    fields: [couponId],
    references: [id]
  )

  @@unique([documentHash])
  @@index([couponId])
  @@index([companyId])
}
```

## Hash do documento

Não salvar outro CNPJ desnecessariamente.

```ts
createHmac(
  'sha256',
  process.env.TRIAL_DOCUMENT_HASH_SECRET!,
)
  .update(normalizedDocument)
  .digest('hex');
```

## Regras

### Sem cupom

```text
cadastrar;
criar cobrança;
ir para pagamento;
liberar após webhook.
```

### Com cupom válido

```text
cadastrar;
não cobrar imediatamente;
status TRIAL;
trial de 30 dias;
empresa ativa;
equipe liberada.
```

### Impedir abuso

```text
um trial por CNPJ;
histórico permanece após arquivamento;
cupom expirado bloqueia;
cupom inativo bloqueia;
limite global respeitado;
requisições simultâneas protegidas por transação;
documentHash único.
```

## Cadastro

Campo:

```text
Cupom promocional
```

Ao aplicar:

```text
Cupom válido:
Você terá 30 dias gratuitos.
Nenhuma cobrança será realizada agora.
O benefício é limitado a uma utilização por CNPJ.
```

## Dia 25

Faltando cinco dias:

```text
calcular licenças atuais;
gerar proposta automática;
gerar quatro opções;
notificar apenas ADMIN;
enviar WhatsApp global;
mostrar banner interno.
```

## Dia 30 sem pagamento

```ts
{
  status: 'SUSPENDED',
  isActive: false,
  billingStatus: 'PAST_DUE',
  suspensionReason: 'trial_expirado',
}
```

ADMIN acessa:

```text
Proposta
Planos
Pagamento
Faturas
Sair
```

Equipe bloqueada.

## Após pagamento

```text
webhook confirma;
assinatura ativa;
empresa ativa;
equipe liberada.
```

## Criar página DEV

```text
/platform/coupons
```

Funções:

```text
criar cupom;
ativar;
desativar;
definir período;
definir máximo de resgates;
ver resgates;
ver empresas convertidas.
```

## Commit

```bash
git add .
git commit -m "feat(trial): adiciona cupom unico por documento e conversao automatica"
```

---

# BLOCO 09 — CONTRATO MANUAL

## Objetivo

Permitir exceções comerciais sem quebrar o billing automático.

## Criar módulo

```text
apps/api/src/modules/manual-contracts/
```

Arquivos:

```text
manual-contracts.module.ts
manual-contracts.controller.ts
manual-contracts.service.ts
manual-contracts.repository.ts
dto/create-manual-contract.dto.ts
dto/update-manual-contract.dto.ts
```

## Modelo

Criar modelo com:

```text
companyId
planId
seatQuantity
agreedAmount
startsAt
endsAt
paymentMethod
externalContractNumber
notes
documentUrl
status
createdBy
createdAt
updatedAt
```

## DTO

```ts
companyId: string;
planId?: string;
seatQuantity: number;
agreedAmount: number;
startsAt: string;
endsAt?: string;

paymentMethod:
  | 'ASAAS'
  | 'BANK_TRANSFER'
  | 'EXTERNAL';

externalContractNumber?: string;
notes: string;
documentUrl?: string;
```

## Regras

```text
somente DEV;
motivo obrigatório;
vigência obrigatória;
valor obrigatório;
licenças obrigatórias;
auditoria obrigatória;
empresa precisa existir;
não permitir COMERCIAL;
não alterar invoice para PAID manualmente;
não reutilizar endpoint comum de billing.
```

## Fluxo

```text
DEV cria contrato;
sistema registra contrato;
sistema define MANUAL_CONTRACT;
sistema libera empresa conforme vigência;
cron encerra quando acabar;
histórico permanece.
```

## Página

Criar:

```text
/platform/contracts
```

Mostrar:

```text
Empresa
Valor acordado
Licenças
Início
Fim
Forma de pagamento
Status
Documento
Responsável
```

## Remover da operação comum

```text
marcar cobrança como paga;
editar status de fatura;
excluir fatura;
editar mensalidade;
forçar liberação sem contrato.
```

## Commit

```bash
git add .
git commit -m "feat(contracts): separa contratos manuais do billing automatico"
```

---

# BLOCO 10 — WHATSAPP GLOBAL SOMENTE DEV

## Objetivo

Manter um único WhatsApp interno da Plataforma.

## Permissão

Manter:

```ts
@Roles('DEV')
```

no controller de comunicação.

## Remover dos clientes

Remover:

```text
WhatsApp da sidebar de ADMIN;
WhatsApp da sidebar de RH;
WhatsApp da sidebar de GESTOR;
WhatsApp dos planos;
WhatsApp dos activeModules padrão;
QR Code por empresa;
sessão WhatsApp por empresa cliente;
envio manual de mensagem pelos clientes.
```

## Sessão global

Configuração:

```env
PLATFORM_WHATSAPP_SESSION_KEY=innovation-platform
```

A sessão de envio não deve usar o `companyId` cliente.

## Payload da fila

```ts
{
  sessionKey: 'innovation-platform',
  recipientCompanyId: companyId,
  phone: string,
  message: string,
  notificationLogId: string
}
```

## Status do envio

```text
PENDING:
adicionado à fila.

SENT:
worker confirmou envio.

FAILED:
worker esgotou tentativas.

SKIPPED:
sem telefone ou canal desativado.
```

## Retry

```ts
{
  attempts: 5,

  backoff: {
    type: 'exponential',
    delay: 30_000,
  },

  removeOnComplete: 100,
  removeOnFail: 500,
}
```

## Destinatário

Prioridade:

```text
telefone financeiro;
telefone do representante legal;
telefone da empresa.
```

## Eventos de WhatsApp

```text
proposta criada;
trial terminando;
cobrança criada;
vencimento próximo;
cobrança vencida;
empresa suspensa;
pagamento confirmado;
empresa liberada;
nota fiscal disponível.
```

## Asaas

Garantir:

```json
{
  "notificationDisabled": true
}
```

na criação e atualização dos clientes Asaas.

Criar rotina para atualizar clientes antigos.

## Página DEV

Criar:

```text
/platform/whatsapp
```

Exibir:

```text
Status
Conectar
QR Code
Desconectar
Número conectado
Fila pendente
Mensagens enviadas
Falhas
Testar envio
```

## Commit

```bash
git add .
git commit -m "fix(whatsapp): consolida canal global exclusivo do dev"
```

---

# BLOCO 11 — IMPORTAÇÃO EXCEL REAL

## Objetivo

Concluir importação segura de funcionários.

## Estrutura

```text
apps/api/src/modules/employees/import/
```

Arquivos:

```text
employees-import.controller.ts
employees-import.service.ts
employees-import-validator.service.ts
employees-import-template.service.ts
employees-import.repository.ts
dto/validate-import.dto.ts
dto/confirm-import.dto.ts
```

## Endpoints

```http
GET /employees/import/template
POST /employees/import/validate
POST /employees/import/confirm
```

## Template

Planilha:

```text
Funcionários
```

Colunas exatas:

```text
Nome
CPF
E-mail
Departamento
Cargo
Data de admissão
Matrícula
Telefone
```

## Segurança

Aceitar:

```text
.xlsx
máximo 2 MB
máximo 2.000 linhas
```

Bloquear:

```text
.xls
.xlsm
.exe
.zip renomeado
.html
macros
fórmulas
links externos
planilhas extras
cabeçalhos alterados
arquivos malformados
```

Validar:

```text
extensão;
MIME;
assinatura ZIP/XLSX;
estrutura interna;
quantidade de planilhas;
quantidade de linhas;
quantidade de colunas;
nomes dos cabeçalhos;
tipos dos campos;
CPF;
e-mail;
matrícula;
duplicidade no arquivo;
duplicidade no banco;
empresa correta.
```

## Fluxo

```text
cliente baixa modelo;
preenche;
envia;
backend valida;
frontend mostra preview;
frontend mostra erros;
cliente confirma;
backend importa em transação;
sistema gera relatório;
sistema registra auditoria.
```

## Resposta de validação

```json
{
  "valid": false,
  "importToken": "token",
  "totalRows": 120,
  "validRows": 117,
  "invalidRows": 3,
  "preview": [],
  "errors": [
    {
      "row": 18,
      "column": "CPF",
      "message": "CPF inválido"
    }
  ]
}
```

## Nunca usar

```ts
buffer.toString('utf-8')
```

para `.xlsx`.

## Não importar no frontend

O frontend apenas envia o arquivo e mostra resultado.

## Commit

```bash
git add .
git commit -m "feat(import): conclui importacao excel segura e transacional"
```

---

# BLOCO 12 — DADOS COMPLETOS DA EMPRESA

## Objetivo

Garantir dados cadastrais, contratuais e fiscais completos.

## Campos

### Identificação

```text
Nome fantasia
Razão social
CNPJ
Inscrição estadual
Inscrição municipal
```

### Contato

```text
E-mail empresarial
Telefone empresarial
```

### Endereço

```text
CEP
Logradouro
Número
Complemento
Bairro
Cidade
Estado
```

### Representante legal

```text
Nome
CPF
Cargo
E-mail
Telefone
```

### Marca

```text
Logo
```

## Remover da interface

```text
Cor principal
Tema
Latitude manual
Longitude manual
Pegar localização atual
```

## Geocodificação

Fluxo:

```text
cliente salva endereço;
backend monta endereço completo;
serviço geocodifica;
latitude e longitude ficam internas;
ponto usa coordenadas internas.
```

Se falhar:

```text
salvar dados cadastrais;
não apagar coordenadas antigas;
retornar aviso;
permitir nova tentativa.
```

## Tolerância de ponto

Mover para:

```text
configuração do módulo de Ponto
```

Não deixar dentro de dados contratuais.

## Banco

Adicionar campos sem remover imediatamente `address`.

Manter legado temporário.

## Contrato

Garantir que o contrato use:

```text
razão social;
CNPJ;
endereço completo;
representante legal;
plano;
licenças;
valor;
vigência.
```

## Commit

```bash
git add .
git commit -m "feat(companies): finaliza dados contratuais e geocodificacao interna"
```

---

# BLOCO 13 — USUÁRIOS, SENHAS E LICENÇAS

## Objetivo

Corrigir hierarquia, segurança e limite por licença.

## Perfis

```text
DEV
COMERCIAL
ADMIN
RH
GESTOR
FUNCIONARIO
CONSULTA
```

## Matriz

### DEV

```text
administra todos;
não pode apagar sua própria conta principal;
opera empresas distintas com auditoria.
```

### ADMIN

Pode administrar:

```text
ADMIN
RH
GESTOR
FUNCIONARIO
CONSULTA
```

Não pode:

```text
criar DEV;
criar COMERCIAL;
acessar outra empresa.
```

### RH

Pode administrar:

```text
RH
GESTOR
FUNCIONARIO
CONSULTA
```

Não pode administrar:

```text
ADMIN
DEV
COMERCIAL
```

## Backend

Aplicar matriz no service.

Não confiar somente no frontend.

## Controller

Permitir rotas administrativas a:

```text
DEV
ADMIN
RH
```

Respeitando a matriz no service.

## Reset de senha

Remover:

```text
12345678
```

DTO único:

```ts
newPassword: string;
```

Regras:

```text
mínimo 10 caracteres;
maiúscula;
minúscula;
número;
símbolo;
não reutilizar senha atual;
forcePasswordChange = true;
failedLoginAttempts = 0;
reset codes = null;
auditoria.
```

## Código de recuperação

Usar:

```ts
randomBytes()
```

Nunca:

```ts
Math.random()
```

## Licenças faturáveis

Contar usuários:

```text
ADMIN
RH
GESTOR
FUNCIONARIO
CONSULTA
```

Somente:

```text
isActive = true
```

Não contar:

```text
DEV
COMERCIAL
Ghost Mode
conta técnica
usuário desativado
funcionário sem login
```

## Limite

Fonte:

```text
CompanySubscription.seatQuantity
```

Não usar:

```text
9999
PRO
BASE
FREE
```

## Ao criar acima do limite

Retornar:

```json
{
  "code": "SEAT_LIMIT_REACHED",
  "message": "A empresa utiliza todas as licenças contratadas.",
  "used": 10,
  "limit": 10
}
```

## Frontend

Mostrar:

```text
Licenças utilizadas
8 de 10

Adicionar licenças
```

## Commit

```bash
git add .
git commit -m "fix(users): estabiliza hierarquia senhas e licencas"
```

---

# BLOCO 14 — MÓDULOS RH ESSENCIAIS

## Objetivo

Finalizar o núcleo do produto antes de adicionar novos módulos.

## Ordem

```text
1. Funcionários
2. Usuários
3. Escalas
4. Ponto
5. Fechamento
6. Férias
7. Gestão
8. Configurações
9. Notificações
10. Plataforma
```

## Checklist obrigatório para cada módulo

```text
controller;
service;
repository;
DTOs;
schema;
tipos frontend;
API client;
permissões;
listagem;
busca;
filtros;
paginação;
cadastro;
edição;
arquivamento ou exclusão segura;
loading;
erro;
estado vazio;
mobile;
auditoria;
testes.
```

## Funcionários

Validar:

```text
cadastro;
edição;
desligamento;
vínculo com usuário;
matrícula;
CPF;
departamento;
cargo;
admissão;
importação;
limites.
```

## Escalas

Validar:

```text
criação;
edição;
dias;
jornada;
intervalos;
feriados;
vínculo com funcionário;
mudanças históricas.
```

## Ponto

Revisar conceitos dos commits:

```text
d454955
5724e84
c2c1b2c
2efd819
```

Validar:

```text
entrada;
saída;
intervalo;
jornada;
horas extras;
atrasos;
faltas;
feriados;
escala;
banco de horas;
ajustes;
aprovação;
PDF.
```

## Fechamento

Validar:

```text
período;
bloqueio de alterações;
reabertura;
motivo;
auditoria;
saldo anterior;
saldo atual;
exportação.
```

## Férias

Validar:

```text
saldo;
período aquisitivo;
solicitação;
aprovação;
reprovação;
cancelamento;
calendário;
conflito com escala.
```

## Gestão

Validar:

```text
agenda;
ASO;
pendências;
notificações;
Kanban operacional;
responsável;
prazos.
```

## Não adicionar agora

```text
ATS;
gestão de projetos;
financeiro empresarial amplo;
IA de folha;
Flutter;
aplicativo de loja;
chatbot.
```

## Commits

Um commit por módulo:

```bash
git commit -m "fix(employees): estabiliza fluxo completo"
git commit -m "fix(schedule): estabiliza escalas"
git commit -m "fix(time-track): estabiliza calculos e fechamento"
git commit -m "fix(vacations): estabiliza fluxo de ferias"
git commit -m "fix(management): estabiliza gestao operacional"
```

---

# BLOCO 15 — RESPONSIVIDADE MOBILE

## Objetivo

Tornar todas as áreas utilizáveis em celular, tablet e desktop.

## Arquivos principais

```text
apps/web/app/[tenant]/dashboard/layout.tsx
apps/web/app/[tenant]/dashboard/_components/dashboard-sidebar.tsx
apps/web/app/[tenant]/dashboard/_components/dashboard-topbar.tsx
apps/web/app/globals.css
```

## Desktop

```text
sidebar fixa de aproximadamente 240px;
conteúdo ao lado;
topbar fixa ou sticky;
```

## Tablet

```text
sidebar compacta ou drawer;
conteúdo responsivo;
cards em duas colunas.
```

## Celular

```text
sidebar escondida;
botão Menu no topbar;
drawer lateral;
overlay;
fecha ao navegar;
fecha ao tocar no overlay;
não ocupa h-screen antes do conteúdo.
```

## Estado

No layout:

```ts
const [mobileMenuOpen, setMobileMenuOpen] =
  useState(false);
```

## Sidebar

Usar comportamento:

```text
fixed no mobile;
sticky no desktop;
translate negativo quando fechada;
z-index correto.
```

## Regras gerais

```text
cards em uma coluna;
inputs com largura total;
botões com área mínima de 44px;
tabelas com scroll horizontal dentro do card;
página sem overflow horizontal;
modais com max-height;
modais com scroll interno;
drawers com largura máxima;
fontes legíveis;
ações principais visíveis;
não usar textos minúsculos para informações importantes.
```

## Tamanhos de teste

```text
360 × 800
390 × 844
412 × 915
768 × 1024
1366 × 768
1920 × 1080
```

## Páginas obrigatórias

```text
Landing
Login
Cadastro
Pagamento
Dashboard
Funcionários
Usuários
Ponto
Férias
Gestão
Configurações
Plataforma
Financeiro
Planos
```

## Commit

```bash
git add .
git commit -m "fix(layout): conclui responsividade desktop tablet e mobile"
```

---

# BLOCO 16 — PLATAFORMA ADMINISTRATIVA BANCÁRIA

## Objetivo

Transformar a aba Plataforma em uma central administrativa rápida e organizada.

## Rotas

```text
/platform
/platform/companies
/platform/subscriptions
/platform/finance
/platform/proposals
/platform/coupons
/platform/contracts
/platform/plans
/platform/access
/platform/whatsapp
/platform/audit
```

## Layout compartilhado

Criar:

```text
apps/web/app/[tenant]/dashboard/platform/layout.tsx
```

Responsabilidades:

```text
cabeçalho;
navegação;
controle por perfil;
container;
espaçamento;
padrão visual.
```

## Navegação

```text
Visão geral
Empresas
Assinaturas
Financeiro
Propostas
Cupons e testes
Contratos
Planos
Acessos
WhatsApp
Auditoria
```

## Visão geral

KPIs:

```text
MRR
ARR
Recebido no mês
A receber
Vencido
Empresas ativas
Trials ativos
Trials vencendo
Usuários faturáveis
Empresas em risco
Falhas de cobrança
Falhas de notificação
```

## Gráficos

```text
faturado × recebido;
MRR de base × usuários;
crescimento de empresas;
conversão de trials;
distribuição por período;
logins;
inadimplência.
```

## Área de atenção

```text
cobrança vencida;
empresa suspensa;
trial vencendo;
empresa acima de 80% das licenças;
assinatura sem ID Asaas;
pagamento confirmado sem liberação;
WhatsApp falhou;
webhook falhou;
empresa sem ADMIN ativo.
```

## Empresas

Mover listagem para:

```text
/platform/companies
```

Adicionar:

```text
paginação;
busca;
filtro de status;
filtro financeiro;
filtro de plano;
filtro de trial;
filtro de saúde;
filtro de responsável.
```

Colunas:

```text
Empresa
Plano
Licenças
Funcionários
Receita
Próximo vencimento
Financeiro
Último acesso
Saúde
Responsável
Ações
```

## Ações

Mostrar:

```text
Abrir
•••
```

Menu:

```text
Ver assinatura
Ver financeiro
Ver usuários
Ver proposta
Ghost Mode
Arquivar
Sincronizar
```

## Remover

```text
exclusão definitiva comum;
sete botões por linha;
status financeiro manual;
marcar como pago;
editar Asaas ID na tela principal;
cobrança mensal manual comum.
```

## Detalhe da empresa

Abas:

```text
Resumo
Assinatura
Financeiro
Usuários e licenças
Proposta e contrato
Acessos
Notificações
Histórico
Técnico
```

## Perfil DEV

Acesso total.

## Perfil COMERCIAL

Permitir somente:

```text
empresas sob sua responsabilidade;
propostas próprias;
contratos próprios;
conversões;
leitura financeira limitada.
```

Bloquear:

```text
WhatsApp;
planos globais;
permissões;
Ghost Mode;
auditoria técnica;
criar cobrança;
editar cobrança;
excluir cobrança;
marcar pagamento;
alterar assinatura global.
```

## Commit

```bash
git add .
git commit -m "refactor(platform): cria console administrativo bancario"
```

---

# BLOCO 17 — COMPLIANCE: PORTARIA 671 E LGPD

## Objetivo

Evitar promessas jurídicas incorretas e preparar o sistema para revisão formal.

<truncated 11439 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.