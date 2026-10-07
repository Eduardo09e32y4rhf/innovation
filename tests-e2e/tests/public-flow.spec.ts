import { expect, test, type Page } from '@playwright/test';

const planId = '33333333-3333-4333-8333-333333333333';
async function plans(page: Page) {
  await page.route('**/auth/public-plans', route => route.fulfill({ json: [{ id: planId, name: 'Plano E2E', price: 100, baseMonthlyPrice: 100, userMonthlyPrice: 10, isActive: true, isRecommended: true, isFree: false, maxUsers: 20 }] }));
}
async function fillIdentity(page: Page) {
  await page.getByLabel('Nome da empresa', { exact: true }).fill('Empresa E2E');
  await page.getByLabel('CNPJ ou CPF').fill('52998224725');
  await page.getByLabel('Seu nome').fill('Pessoa de Teste');
  await page.getByLabel('E-mail de acesso').fill('person@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('SenhaForte@123');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

test('landing oferece entrada e cadastro sem promessa jurídica absoluta', async ({ page }) => {
  await plans(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ponto, escalas e folha.*sem planilhas/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar minha empresa' }).first()).toHaveAttribute('href', '/cadastro');
  await expect(page.getByText('100% em conformidade')).toHaveCount(0);
  await expect(page.getByText('validade jurídica garantida')).toHaveCount(0);
});

test('login permite voltar ao site ou criar a empresa', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar minha empresa' })).toHaveAttribute('href', '/cadastro');
  await expect(page.getByRole('link', { name: 'Innovation RH Connect — página inicial' })).toHaveAttribute('href', '/');
});

test('rota antiga de criação de conta redireciona para o cadastro funcional', async ({ page }) => {
  await plans(page);
  await page.goto('/criar-conta');
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page.getByLabel('Nome da empresa', { exact: true })).toBeVisible();
});

test('rota antiga preserva parâmetros comerciais e usuários contratados', async ({ page }) => {
  await plans(page);
  await page.goto(`/criar-conta?planId=${planId}&seats=5&ref=vendedor-demo`);
  await expect(page).toHaveURL(new RegExp(`/cadastro\\?planId=${planId}&seats=5&ref=vendedor-demo$`));
  await fillIdentity(page);
  await expect(page.getByLabel('Usuários', { exact: true })).toHaveValue('5');
  await expect(page.getByRole('radio', { name: /Plano E2E/ })).toBeChecked();
});

test('cadastro expõe plano, licenças e cupom e exige consentimento sem overflow', async ({ page }) => {
  await plans(page);
  let created = false;
  await page.route('**/auth/register-company', route => { created = true; return route.fulfill({ status: 503, json: { message: 'Ambiente de teste' } }); });
  await page.goto('/cadastro');
  await expect(page.getByLabel('Nome da empresa', { exact: true })).toBeVisible();
  await expect(page.getByText('10 ou mais caracteres')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await fillIdentity(page);
  await expect(page.getByLabel('Usuários', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Cupom (opcional)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar minha empresa' })).toBeDisabled();
  expect(created).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
  await page.getByRole('button', { name: 'Criar minha empresa' }).click();
  await expect.poll(() => created).toBe(true);
  await expect(page.getByRole('alert').filter({ hasText: 'Ambiente de teste' })).toBeVisible();
});
