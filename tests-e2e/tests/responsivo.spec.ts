import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { auditar } from '../lib/auditoria-layout';

/**
 * Robô de tamanhos de tela: abre cada rota em celular pequeno, celular, tablet, notebook e desktop e acusa
 *  - rolagem lateral da página inteira,
 *  - botão, link ou campo cortado para fora da tela (fora de áreas que rolam de propósito),
 *  - alvo de toque pequeno demais (< 24 px é falha; < 44 px vira aviso no relatório),
 *  - tela em branco e falta da meta viewport.
 * Rotas públicas rodam sempre. As do painel só rodam com E2E_LOGIN_EMAIL e E2E_LOGIN_SENHA (API de teste no ar).
 */
const TELAS = [
  { nome: 'celular pequeno 320', width: 320, height: 640 },
  { nome: 'celular 390', width: 390, height: 844 },
  { nome: 'tablet 768', width: 768, height: 1024 },
  { nome: 'notebook 1280', width: 1280, height: 720 },
  { nome: 'desktop 1920', width: 1920, height: 1080 },
] as const;

const ROTAS_PUBLICAS = ['/', '/login', '/cadastro', '/planos', '/carreiras', '/esqueci-senha', '/termos', '/privacidade', '/suporte'];
const ROTAS_PAINEL = ['/dashboard', '/dashboard/employees', '/dashboard/escalas', '/dashboard/time-track', '/dashboard/vacations', '/dashboard/jobs', '/dashboard/faturas', '/dashboard/users', '/dashboard/settings', '/dashboard/support'];

async function checar(page: Page, rota: string, tela: (typeof TELAS)[number], testInfo: TestInfo) {
  await page.setViewportSize({ width: tela.width, height: tela.height });
  await page.goto(rota, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(300);
  const { falhas, avisos } = await auditar(page);
  if (avisos.length) testInfo.annotations.push(...avisos.map((a) => ({ type: `aviso ${tela.nome} ${rota}`, description: `${a.tipo}: ${a.detalhe}` })));
  if (falhas.length) await testInfo.attach(`${rota.replace(/\W+/g, '_')}-${tela.width}.png`, { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
  expect.soft(falhas, `${rota} em ${tela.nome}:\n${falhas.map((f) => `  - ${f.tipo}: ${f.detalhe}`).join('\n')}`).toEqual([]);
}

test.describe('rotas públicas em todos os tamanhos de tela', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'o próprio teste percorre os tamanhos de tela');
    await page.route('**/auth/public-plans', (route) => route.fulfill({ json: [{ id: '33333333-3333-4333-8333-333333333333', name: 'Plano E2E', price: 100, baseMonthlyPrice: 100, userMonthlyPrice: 10, isActive: true, isRecommended: true, isFree: false, maxUsers: 20 }] }));
  });
  for (const rota of ROTAS_PUBLICAS) {
    test(`${rota}`, async ({ page }, testInfo) => {
      for (const tela of TELAS) await checar(page, rota, tela, testInfo);
    });
  }
});

test.describe('painel em todos os tamanhos de tela (precisa de login de teste)', () => {
  test.skip(!process.env.E2E_LOGIN_EMAIL || !process.env.E2E_LOGIN_SENHA, 'defina E2E_LOGIN_EMAIL e E2E_LOGIN_SENHA (usuário do banco de teste)');
  test.beforeEach(async ({}, testInfo) => { test.skip(testInfo.project.name !== 'chromium-desktop', 'o próprio teste percorre os tamanhos de tela'); });

  test('todas as telas principais', async ({ page }, testInfo) => {
    test.setTimeout(10 * 60_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/login');
    await page.locator('#login-email').fill(process.env.E2E_LOGIN_EMAIL!);
    await page.locator('input[type="password"]').fill(process.env.E2E_LOGIN_SENHA!);
    await page.getByRole('button', { name: /^entrar/i }).click();
    await page.waitForURL(/\/dashboard|\/portal|\/ceo-onboarding/, { timeout: 30_000 });
    const tenant = new URL(page.url()).pathname.split('/')[1];
    for (const rota of ROTAS_PAINEL) for (const tela of TELAS) await checar(page, `/${tenant}${rota}`, tela, testInfo);
  });
});
