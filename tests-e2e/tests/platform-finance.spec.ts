import { expect, test, type Page } from '@playwright/test';

const DEV_EMAIL = process.env.E2E_DEV_EMAIL || 'dev@test.local';
const DEV_PASSWORD = process.env.E2E_DEV_PASSWORD || 'Teste@123';
const company = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Empresa E2E Asaas',
  document: '12345678000199',
  status: 'ACTIVE',
  plan: 'PRO',
  billingStatus: 'ACTIVE',
  asaasCustomerId: 'cus_e2e',
  asaasSubscriptionId: null,
  usersCount: 1,
  maxUsers: 10,
  employeesCount: 2,
  maxEmployees: 50,
  activeModules: ['employees'],
};

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('E-mail corporativo').fill(DEV_EMAIL);
  await page.getByPlaceholder('Senha').fill(DEV_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

async function mockPlatform(page: Page) {
  await page.route('**/platform/stats', route => route.fulfill({ json: { companies: 1, users: 1, employees: 2, messages: 0, activeCompanies: 1, suspendedCompanies: 0, pastDueCompanies: 0 } }));
  await page.route('**/finance/platform/summary**', route => route.fulfill({ json: { totals: { billed: 199.9, received: 99.9, open: 100, overdue: 0, canceled: 0 }, count: 1, conversionRate: 50, monthly: [], mrr: 199.9, activeSubscriptions: 1 } }));
  await page.route('**/platform/companies', route => route.fulfill({ json: [company] }));
  await page.route('**/finance/platform/invoices**', route => route.fulfill({ json: { items: [], pagination: { page: 1, limit: 6, total: 0, pages: 0 } } }));
  await page.route('**/finance/platform/webhook-events**', route => route.fulfill({ json: [] }));
}

test.describe('Plataforma: Asaas e cobrancas', () => {
  test('ativa cobranca automatica no Asaas pelo painel da empresa', async ({ page }) => {
    await mockPlatform(page);
    let checkoutCalled = false;
    await page.route('**/finance/platform/companies/*/checkout', async route => {
      checkoutCalled = true;
      await route.fulfill({ json: { active: true, company: { ...company, billingStatus: 'ACTIVE' }, paymentUrl: null } });
    });

    await login(page);
    await page.goto('/dashboard/platform');
    await expect(page.getByRole('heading', { name: 'Operacao da Plataforma' })).toBeVisible();
    await page.getByRole('button', { name: /Ativar Asaas/i }).click();
    await expect.poll(() => checkoutCalled).toBe(true);
    await expect(page.getByText('Cobranca automatica ativada.')).toBeVisible();
  });

  test('registra cobranca manual local sem enviar ao Asaas', async ({ page }) => {
    await mockPlatform(page);
    let body: Record<string, unknown> | undefined;
    await page.route('**/finance/platform/invoices', async route => {
      if (route.request().method() === 'POST') {
        body = route.request().postDataJSON();
        await route.fulfill({ json: { id: 'invoice-e2e', ...company, company, amount: 150, status: 'OPEN', billingType: 'UNDEFINED', dueDate: '2026-08-01' } });
        return;
      }
      await route.continue();
    });

    await login(page);
    await page.goto('/dashboard/platform');
    await page.getByRole('button', { name: /Emitir cobranca/i }).click();
    await page.getByLabel('Empresa').selectOption(company.id);
    await page.getByLabel('Valor').fill('150');
    await page.getByLabel('Vencimento').fill('2026-08-01');
    await page.getByLabel('Descricao').fill('Taxa manual E2E');
    await page.getByLabel(/Enviar automaticamente ao Asaas/i).uncheck();
    await page.getByRole('button', { name: 'Criar cobranca' }).click();
    await expect.poll(() => body?.sendToAsaas).toBe(false);
    await expect(page.getByText('Cobranca local registrada.')).toBeVisible();
  });

  test('sincroniza o status de uma cobranca existente', async ({ page }) => {
    await page.route('**/finance/platform/summary**', route => route.fulfill({ json: { totals: { billed: 150, received: 0, open: 150, overdue: 0, canceled: 0 }, count: 1, conversionRate: 0, monthly: [], mrr: 0, activeSubscriptions: 0 } }));
    await page.route('**/finance/platform/invoices**', async route => {
      if (route.request().method() === 'POST') return route.continue();
      await route.fulfill({ json: { items: [{ id: 'invoice-sync', company, description: 'Mensalidade E2E', amount: 150, dueDate: '2026-08-01', status: 'OPEN', billingType: 'PIX', asaasPaymentId: 'pay_e2e', invoiceUrl: null }], pagination: { page: 1, limit: 20, total: 1, pages: 1 } } });
    });
    let syncCalled = false;
    await page.route('**/finance/platform/invoices/invoice-sync/sync', async route => {
      syncCalled = true;
      await route.fulfill({ json: { id: 'invoice-sync', company, amount: 150, status: 'PAID', billingType: 'PIX', dueDate: '2026-08-01' } });
    });

    await login(page);
    await page.goto('/dashboard/platform/finance');
    await expect(page.getByText('Mensalidade E2E')).toBeVisible();
    await page.getByTitle('Sincronizar').click();
    await expect.poll(() => syncCalled).toBe(true);
    await expect(page.getByText('Status sincronizado com o Asaas.')).toBeVisible();
  });
});
