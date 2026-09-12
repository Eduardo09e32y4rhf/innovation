# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: platform-finance.spec.ts >> Plataforma: Asaas e cobrancas >> registra cobranca manual local sem enviar ao Asaas
- Location: tests/platform-finance.spec.ts:54:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /entrar/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e5]:
    - img "Innovation" [ref=e8]
    - generic [ref=e9]:
      - generic [ref=e10]:
        - heading "Entrar na Plataforma" [level=1] [ref=e11]
        - paragraph [ref=e12]: Digite suas credenciais corporativas abaixo.
      - generic [ref=e14]:
        - generic [ref=e15]:
          - link "Voltar para o site" [ref=e16] [cursor=pointer]:
            - /url: /
          - link "Criar minha empresa" [ref=e17] [cursor=pointer]:
            - /url: /cadastro
        - generic [ref=e18]:
          - img [ref=e20]
          - textbox "E-mail corporativo" [ref=e23]: dev@test.local
        - generic [ref=e24]:
          - img [ref=e26]
          - textbox "Senha" [active] [ref=e29]: Teste@123
          - button "Exibir senha" [ref=e30] [cursor=pointer]:
            - img [ref=e31]
        - button "Esqueci a senha" [ref=e35] [cursor=pointer]
        - button "Acessar Plataforma" [ref=e36] [cursor=pointer]:
          - text: Acessar Plataforma
          - img [ref=e37]
        - paragraph [ref=e39]:
          - text: Ainda não tem uma conta?
          - link "Criar agora" [ref=e40] [cursor=pointer]:
            - /url: /cadastro
        - button "! Reportar problema" [ref=e43] [cursor=pointer]:
          - generic [ref=e44]: "!"
          - generic [ref=e45]: Reportar problema
  - alert [ref=e46]
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  |
  3  | const DEV_EMAIL = process.env.E2E_DEV_EMAIL || 'dev@test.local';
  4  | const DEV_PASSWORD = process.env.E2E_DEV_PASSWORD || 'Teste@123';
  5  | const company = {
  6  |   id: '11111111-1111-4111-8111-111111111111',
  7  |   name: 'Empresa E2E Asaas',
  8  |   document: '12345678000199',
  9  |   status: 'ACTIVE',
  10 |   plan: 'PRO',
  11 |   billingStatus: 'ACTIVE',
  12 |   asaasCustomerId: 'cus_e2e',
  13 |   asaasSubscriptionId: null,
  14 |   usersCount: 1,
  15 |   maxUsers: 10,
  16 |   employeesCount: 2,
  17 |   maxEmployees: 50,
  18 |   activeModules: ['employees'],
  19 | };
  20 |
  21 | async function login(page: Page) {
  22 |   await page.goto('/login');
  23 |   await page.getByPlaceholder('E-mail corporativo').fill(DEV_EMAIL);
  24 |   await page.getByPlaceholder('Senha').fill(DEV_PASSWORD);
> 25 |   await page.getByRole('button', { name: /entrar/i }).click();
     |                                                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  26 |   await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
  27 | }
  28 |
  29 | async function mockPlatform(page: Page) {
  30 |   await page.route('**/platform/stats', route => route.fulfill({ json: { companies: 1, users: 1, employees: 2, messages: 0, activeCompanies: 1, suspendedCompanies: 0, pastDueCompanies: 0 } }));
  31 |   await page.route('**/finance/platform/summary**', route => route.fulfill({ json: { totals: { billed: 199.9, received: 99.9, open: 100, overdue: 0, canceled: 0 }, count: 1, conversionRate: 50, monthly: [], mrr: 199.9, activeSubscriptions: 1 } }));
  32 |   await page.route('**/platform/companies', route => route.fulfill({ json: [company] }));
  33 |   await page.route('**/finance/platform/invoices**', route => route.fulfill({ json: { items: [], pagination: { page: 1, limit: 6, total: 0, pages: 0 } } }));
  34 |   await page.route('**/finance/platform/webhook-events**', route => route.fulfill({ json: [] }));
  35 | }
  36 |
  37 | test.describe('Plataforma: Asaas e cobrancas', () => {
  38 |   test('ativa cobranca automatica no Asaas pelo painel da empresa', async ({ page }) => {
  39 |     await mockPlatform(page);
  40 |     let checkoutCalled = false;
  41 |     await page.route('**/finance/platform/companies/*/checkout', async route => {
  42 |       checkoutCalled = true;
  43 |       await route.fulfill({ json: { active: true, company: { ...company, billingStatus: 'ACTIVE' }, paymentUrl: null } });
  44 |     });
  45 |
  46 |     await login(page);
  47 |     await page.goto('/dashboard/platform');
  48 |     await expect(page.getByRole('heading', { name: 'Operacao da Plataforma' })).toBeVisible();
  49 |     await page.getByRole('button', { name: /Ativar Asaas/i }).click();
  50 |     await expect.poll(() => checkoutCalled).toBe(true);
  51 |     await expect(page.getByText('Cobranca automatica ativada.')).toBeVisible();
  52 |   });
  53 |
  54 |   test('registra cobranca manual local sem enviar ao Asaas', async ({ page }) => {
  55 |     await mockPlatform(page);
  56 |     let body: Record<string, unknown> | undefined;
  57 |     await page.route('**/finance/platform/invoices', async route => {
  58 |       if (route.request().method() === 'POST') {
  59 |         body = route.request().postDataJSON();
  60 |         await route.fulfill({ json: { id: 'invoice-e2e', ...company, company, amount: 150, status: 'OPEN', billingType: 'UNDEFINED', dueDate: '2026-08-01' } });
  61 |         return;
  62 |       }
  63 |       await route.continue();
  64 |     });
  65 |
  66 |     await login(page);
  67 |     await page.goto('/dashboard/platform');
  68 |     await page.getByRole('button', { name: /Emitir cobranca/i }).click();
  69 |     await page.getByLabel('Empresa').selectOption(company.id);
  70 |     await page.getByLabel('Valor').fill('150');
  71 |     await page.getByLabel('Vencimento').fill('2026-08-01');
  72 |     await page.getByLabel('Descricao').fill('Taxa manual E2E');
  73 |     await page.getByLabel(/Enviar automaticamente ao Asaas/i).uncheck();
  74 |     await page.getByRole('button', { name: 'Criar cobranca' }).click();
  75 |     await expect.poll(() => body?.sendToAsaas).toBe(false);
  76 |     await expect(page.getByText('Cobranca local registrada.')).toBeVisible();
  77 |   });
  78 |
  79 |   test('sincroniza o status de uma cobranca existente', async ({ page }) => {
  80 |     await page.route('**/finance/platform/summary**', route => route.fulfill({ json: { totals: { billed: 150, received: 0, open: 150, overdue: 0, canceled: 0 }, count: 1, conversionRate: 0, monthly: [], mrr: 0, activeSubscriptions: 0 } }));
  81 |     await page.route('**/finance/platform/invoices**', async route => {
  82 |       if (route.request().method() === 'POST') return route.continue();
  83 |       await route.fulfill({ json: { items: [{ id: 'invoice-sync', company, description: 'Mensalidade E2E', amount: 150, dueDate: '2026-08-01', status: 'OPEN', billingType: 'PIX', asaasPaymentId: 'pay_e2e', invoiceUrl: null }], pagination: { page: 1, limit: 20, total: 1, pages: 1 } } });
  84 |     });
  85 |     let syncCalled = false;
  86 |     await page.route('**/finance/platform/invoices/invoice-sync/sync', async route => {
  87 |       syncCalled = true;
  88 |       await route.fulfill({ json: { id: 'invoice-sync', company, amount: 150, status: 'PAID', billingType: 'PIX', dueDate: '2026-08-01' } });
  89 |     });
  90 |
  91 |     await login(page);
  92 |     await page.goto('/dashboard/platform/finance');
  93 |     await expect(page.getByText('Mensalidade E2E')).toBeVisible();
  94 |     await page.getByTitle('Sincronizar').click();
  95 |     await expect.poll(() => syncCalled).toBe(true);
  96 |     await expect(page.getByText('Status sincronizado com o Asaas.')).toBeVisible();
  97 |   });
  98 | });
  99 |
```