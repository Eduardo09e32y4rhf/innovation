import { expect, test, type Page } from '@playwright/test';

const planId = '33333333-3333-4333-8333-333333333333';
async function plans(page: Page) {
  await page.route('**/auth/public-plans', route => route.fulfill({ json: [{ id: planId, name: 'Plano E2E', code: 'RS', signupEnabled: true, trialDays: 30, includedUnits: 1, price: 100, baseMonthlyPrice: 100, userMonthlyPrice: 10, isActive: true, isRecommended: true, isFree: false, maxUsers: 20 }] }));
  await page.route('**/auth/public-plans/quote', route => { const data = route.request().postDataJSON(); return route.fulfill({ json: { total: 100 + Math.max(0, data.seatQuantity - 1) * 10, commitmentMonths: 1, seatQuantity: data.seatQuantity, couponApplied: false, trialDays: 30 } }); });
}
async function fillIdentity(page: Page) {
  await page.getByLabel('Nome do seu negócio', { exact: true }).fill('Empresa E2E');
  await page.getByLabel('CNPJ ou CPF').fill('52998224725');
  await page.getByLabel('Seu nome').fill('Pessoa de Teste');
  await page.getByLabel('E-mail de acesso').fill('person@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('SenhaForte@123');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

test('landing oferece entrada e cadastro sem promessa jurídica absoluta', async ({ page }) => {
  await plans(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /A hora de .*chegou/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Começar teste grátis' }).first()).toHaveAttribute('href', '/cadastro?perfil=empreendedor');
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
  await expect(page.getByLabel('Nome do seu negócio', { exact: true })).toBeVisible();
});

test('rota antiga preserva parâmetros comerciais e usuários contratados', async ({ page }) => {
  await plans(page);
  await page.goto(`/criar-conta?planId=${planId}&seats=5&ref=vendedor-demo`);
  await expect(page).toHaveURL(new RegExp(`/cadastro\\?planId=${planId}&seats=5&ref=vendedor-demo$`));
  await fillIdentity(page);
  await expect(page.getByLabel('Vagas por mês', { exact: true })).toHaveValue('5');
  await expect(page.getByRole('radio', { name: /Plano E2E/ })).toBeChecked();
});

test('cadastro expõe plano, licenças e cupom e exige consentimento sem overflow', async ({ page }) => {
  await plans(page);
  let created = false;
  let payload: Record<string, unknown> | null = null;
  await page.route('**/auth/register-company', route => { created = true; payload = route.request().postDataJSON(); return route.fulfill({ status: 503, json: { message: 'Ambiente de teste' } }); });
  await page.goto('/cadastro');
  await expect(page.getByLabel('Nome do seu negócio', { exact: true })).toBeVisible();
  await expect(page.getByText('10 ou mais caracteres')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await fillIdentity(page);
  await expect(page.getByLabel('Vagas por mês', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Cupom de desconto ou extensão do teste (opcional)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar conta e começar teste grátis' })).toBeDisabled();
  expect(created).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
  await page.getByRole('button', { name: 'Criar conta e começar teste grátis' }).click();
  await expect.poll(() => created).toBe(true);
  expect(payload).toMatchObject({ recruitmentAccountType: 'EMPLOYER', planId, seatQuantity: 1 });
  await expect(page.getByRole('alert').filter({ hasText: 'Ambiente de teste' })).toBeVisible();
});

test('cadastro de recrutador e entrada gratuita de candidato sao separados', async ({ page }) => {
  await plans(page);
  await page.goto('/cadastro?perfil=recrutador');
  await expect(page.getByRole('radio', { name: /Sou recrutador/ })).toBeChecked();
  await expect(page.getByLabel('Nome da consultoria ou nome profissional')).toBeVisible();
  await page.getByRole('link', { name: 'Crie sua conta gratuita de candidato' }).click();
  await expect(page.getByRole('heading', { name: 'Criar minha conta', exact: true })).toBeVisible();
  await expect(page.getByText(/Sua conta é gratuita, sem plano ou dados de cobrança/)).toBeVisible();
  await expect(page.getByLabel('CNPJ ou CPF')).toHaveCount(0);
});

test('cupom invalido impede criar uma conta com preco nao confirmado', async ({ page }) => {
  await plans(page);
  await page.route('**/auth/public-plans/quote', route => route.fulfill({ status: 400, json: { message: 'Cupom indisponível.' } }));
  let created = false;
  await page.route('**/auth/register-company', route => { created = true; return route.fulfill({ status: 500 }); });
  await page.goto('/cadastro');
  await fillIdentity(page);
  await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
  await expect(page.getByRole('alert').filter({ hasText: 'Cupom indisponível.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar conta e começar teste grátis' })).toBeDisabled();
  expect(created).toBe(false);
});
