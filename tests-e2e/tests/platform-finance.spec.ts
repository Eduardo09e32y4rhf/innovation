import { expect, test, type Page } from '@playwright/test';

// Testes da interface com API isolada. O CI de integração testa sessões em PostgreSQL real.
const company = {
  id: '11111111-1111-4111-8111-111111111111', slug: 'e2e', name: 'Empresa E2E Asaas', document: '12345678000199',
  status: 'ACTIVE', plan: 'PRO', billingStatus: 'ACTIVE', platformPlanId: 'plan-e2e',
  asaasCustomerId: 'cus_e2e', asaasSubscriptionId: null, usersCount: 1, maxUsers: 10, employeesCount: 2, maxEmployees: 50,
  activeModules: ['employees'], open: { count: 1, total: 150 }, overdue: { count: 0, total: 0 },
  subscription: { status: 'ACTIVE', seatQuantity: 5, billingPaused: false, nextDueDate: '2026-11-01', planId: 'plan-e2e' },
};
const user = { sub: '22222222-2222-4222-8222-222222222222', name: 'Pessoa DEV de teste', email: 'dev@example.test', companyId: company.id, role: 'DEV', companyStatus: 'ACTIVE', billingStatus: 'ACTIVE', customPermissions: [] };
const auth = { access_token: 'ui-test-session', user, company, passwordChangeRequired: false, mfaEnrollmentRequired: false };
const summary = { totals: { billed: 150, received: 0, open: 150, overdue: 0, canceled: 0 }, count: 1, conversionRate: 0, monthly: [], mrr: 150, activeSubscriptions: 1 };
const invoice = { id: 'invoice-sync', companyId: company.id, company, description: 'Mensalidade E2E', amount: 150, dueDate: '2026-10-30', status: 'OPEN', billingType: 'PIX', asaasPaymentId: 'pay_e2e', invoiceUrl: null, createdAt: '2026-10-01' };
const permissions = ['faturas.ver', 'faturas.pagar', 'faturas.nf_anexar', 'faturas.cobrar', 'faturas.desconto', 'faturas.reembolsar', 'faturas.todas_empresas', 'faturas.plano'];

async function mockPlatform(page: Page) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const data: Record<string, unknown> = {
      '/auth/refresh': auth, '/auth/me': user, '/companies/me': company,
      '/legal/terms/status': { required: false }, '/welcome/status': { show: false },
      '/notifications/dashboard-widget': { unreadCount: 0, notifications: [] }, '/proposals/company': [],
      '/faturas/permissoes/minhas': { permissions },
      '/platform/companies': { data: [company], total: 1, page: 1, limit: 1000 },
      '/platform/plans': [{ id: 'plan-e2e', name: 'Plano E2E', price: 150, baseMonthlyPrice: 100, userMonthlyPrice: 10, isActive: true }],
      '/finance/platform/summary': summary, '/finance/platform/audit-logs': [], '/finance/platform/webhook-events': [],
      '/faturas/plataforma/summary': summary, '/faturas/plataforma/companies': { items: [company], pagination: { page: 1, limit: 20, total: 1, pages: 1 } },
      [`/faturas/plataforma/companies/${company.id}/invoices`]: [invoice],
      [`/faturas/plataforma/companies/${company.id}/adjustments`]: [],
    };
    if (path in data) return route.fulfill({ json: data[path] });
    if (path === '/users/ping' || path === '/users/page-view') return route.fulfill({ json: { ok: true } });
    return route.fulfill({ status: 404, json: { message: `Fixture não definida: ${path}` } });
  });
}
async function openCompany(page: Page) {
  await page.goto('/e2e/dashboard/faturas');
  await page.getByRole('row').filter({ hasText: company.name }).click();
  await expect(page.getByRole('button', { name: 'Nova cobrança', exact: true })).toBeVisible();
}

test.describe('Faturas: integração da interface com API isolada', () => {
  test('gera cobrança de onboarding no Asaas pelo painel da assinatura', async ({ page }) => {
    await mockPlatform(page);
    let checkoutCalled = false;
    await page.route(`**/finance/platform/companies/${company.id}/checkout`, route => {
      checkoutCalled = true;
      return route.fulfill({ json: { active: true, company, paymentUrl: null } });
    });
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/e2e/dashboard/faturas?aba=assinaturas');
    await page.getByRole('button', { name: 'Detalhes', exact: true }).click();
    await page.getByRole('button', { name: 'Gerar cobrança', exact: true }).click();
    await expect.poll(() => checkoutCalled).toBe(true);
    await expect(page.getByText('Cobrança de onboarding gerada.', { exact: true })).toBeVisible();
  });

  test('registra cobrança manual local sem enviar ao Asaas', async ({ page }) => {
    await mockPlatform(page);
    let body: Record<string, unknown> | undefined;
    await page.route('**/faturas/plataforma/invoices', route => {
      body = route.request().postDataJSON();
      return route.fulfill({ json: { ...invoice, id: 'manual-e2e' } });
    });
    await openCompany(page);
    await page.getByRole('button', { name: 'Nova cobrança', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova cobrança avulsa' });
    await dialog.getByLabel('Descrição', { exact: true }).fill('Taxa manual E2E');
    await dialog.getByLabel('Valor em R$', { exact: true }).fill('150');
    await dialog.getByLabel('Vencimento', { exact: true }).fill('2026-10-30');
    await dialog.getByRole('checkbox', { name: 'Enviar automaticamente ao Asaas' }).uncheck();
    await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect.poll(() => body?.sendToAsaas).toBe(false);
    expect(body).toMatchObject({ companyId: company.id, amount: 150, description: 'Taxa manual E2E' });
    await expect(page.getByText('Cobrança criada.', { exact: true })).toBeVisible();
  });

  test('sincroniza uma cobrança existente com o provedor', async ({ page }) => {
    await mockPlatform(page);
    let synced = false;
    await page.route(`**/faturas/plataforma/invoices/${invoice.id}/sync`, route => {
      synced = true;
      return route.fulfill({ json: { ...invoice, status: 'PAID' } });
    });
    await openCompany(page);
    await expect(page.getByText('Mensalidade E2E')).toBeVisible();
    await page.getByRole('button', { name: 'Sincronizar', exact: true }).click();
    await expect.poll(() => synced).toBe(true);
    await expect(page.getByText('Fatura sincronizada com o provedor.', { exact: true })).toBeVisible();
  });

  test('falha externa mantém o cancelamento aberto e não anuncia sucesso', async ({ page }) => {
    await mockPlatform(page);
    await page.route(`**/faturas/plataforma/companies/${company.id}/cancel-subscription`, route => route.fulfill({ status: 503, json: { message: 'O provedor não confirmou o cancelamento.' } }));
    await openCompany(page);
    await page.getByRole('button', { name: 'Cancelar assinatura', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Cancelar assinatura', exact: true });
    await dialog.getByLabel('Motivo (fica no registro)', { exact: true }).fill('Cancelamento de teste');
    await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('O provedor não confirmou o cancelamento.');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Assinatura cancelada.', { exact: true })).toHaveCount(0);
  });
});
