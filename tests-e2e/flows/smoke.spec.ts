import { expect, test } from '../fixtures';
import { API_URL, WEB_URL } from '../helpers/env';
import { horizontalOverflow, visit, watchApi } from '../helpers/ui';

/**
 * Fumaça dos fluxos principais com API e banco reais (sem mocks).
 * Cada tela precisa: abrir para o perfil certo, sem voltar ao login, sem erro 5xx da API,
 * sem erro de JavaScript e sem rolagem horizontal na largura do projeto (desktop ou 360).
 */
const ADMIN_AREAS = [
  { nome: 'painel', path: 'dashboard' },
  { nome: 'funcionários', path: 'dashboard/employees' },
  { nome: 'cadastro de funcionário', path: 'dashboard/employees/new' },
  { nome: 'ponto', path: 'dashboard/time-track' },
  { nome: 'escalas e ponto', path: 'dashboard/escalas?view=ponto' },
  { nome: 'férias', path: 'dashboard/vacations' },
  { nome: 'vagas', path: 'dashboard/jobs' },
  { nome: 'faturas', path: 'dashboard/faturas' },
  { nome: 'usuários', path: 'dashboard/users' },
] as const;

async function expectHealthyScreen(page: import('@playwright/test').Page, watch: ReturnType<typeof watchApi>) {
  expect(new URL(page.url()).pathname, 'voltou para o login').not.toMatch(/^\/login/);
  await expect(page.locator('main').first()).toBeVisible();
  await page.waitForTimeout(1_500); // deixa as consultas da tela terminarem
  expect(watch.serverErrors, 'erros 5xx da API').toEqual([]);
  expect(watch.pageErrors, 'erros de JavaScript na página').toEqual([]);
  const { overflow } = await horizontalOverflow(page);
  expect(overflow, 'rolagem horizontal da página (px)').toBeLessThanOrEqual(1);
}

test.describe('administrador', () => {
  test('login leva ao painel da empresa', async ({ adminSession }) => {
    expect(adminSession.tenant).toBeTruthy();
  });

  for (const area of ADMIN_AREAS) {
    test(`abre ${area.nome}`, async ({ adminPage: page, adminSession }) => {
      const watch = watchApi(page, API_URL);
      await visit(page, `${WEB_URL}/${adminSession.tenant}/${area.path}`);
      await expectHealthyScreen(page, watch);
    });
  }
});

test.describe('funcionário', () => {
  for (const area of [{ nome: 'painel', path: 'dashboard' }, { nome: 'ponto', path: 'dashboard/time-track' }, { nome: 'férias', path: 'dashboard/vacations' }]) {
    test(`abre ${area.nome}`, async ({ funcPage: page, funcSession }) => {
      const watch = watchApi(page, API_URL);
      await visit(page, `${WEB_URL}/${funcSession.tenant}/${area.path}`);
      await expectHealthyScreen(page, watch);
    });
  }

  test('área de usuários não quebra (bloqueia ou redireciona, sem erro 5xx)', async ({ funcPage: page, funcSession }) => {
    const watch = watchApi(page, API_URL);
    await visit(page, `${WEB_URL}/${funcSession.tenant}/dashboard/users`);
    await page.waitForTimeout(1_500);
    expect(watch.serverErrors, 'erros 5xx da API').toEqual([]);
    expect(watch.pageErrors, 'erros de JavaScript na página').toEqual([]);
  });
});

test.describe('visitante sem login', () => {
  test('landing page abre e oferece entrada', async ({ page }) => {
    const watch = watchApi(page, API_URL);
    await page.goto(`${WEB_URL}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined);
    expect(watch.serverErrors, 'erros 5xx da API').toEqual([]);
    const { overflow } = await horizontalOverflow(page);
    expect(overflow, 'rolagem horizontal da página (px)').toBeLessThanOrEqual(1);
  });

  test('portal de vagas públicas abre sem login', async ({ page }) => {
    const watch = watchApi(page, API_URL);
    await page.goto(`${WEB_URL}/carreiras`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main').first()).toBeVisible();
    await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined);
    expect(watch.serverErrors, 'erros 5xx da API').toEqual([]);
    expect(watch.pageErrors, 'erros de JavaScript na página').toEqual([]);
    const { overflow } = await horizontalOverflow(page);
    expect(overflow, 'rolagem horizontal da página (px)').toBeLessThanOrEqual(1);
  });

  test('API responde saúde e prontidão', async ({ request }) => {
    expect((await request.get(`${API_URL}/health/live`)).ok()).toBe(true);
    expect((await request.get(`${API_URL}/health/ready`)).ok()).toBe(true);
  });
});
