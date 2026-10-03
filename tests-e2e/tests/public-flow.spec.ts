import { expect, test } from '@playwright/test';

test('landing oferece entrada e cadastro sem promessa jurídica absoluta', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Feche a folha em minutos/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar minha empresa' }).first()).toHaveAttribute('href', '/cadastro');
  await expect(page.getByText('100% em conformidade')).toHaveCount(0);
  await expect(page.getByText('validade jurídica garantida')).toHaveCount(0);
});

test('login permite voltar ao site ou criar a empresa', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Entrar na Plataforma' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar agora' })).toHaveAttribute('href', '/cadastro');
  await expect(page.getByRole('link', { name: 'Voltar para o site' })).toHaveAttribute('href', '/');
});

test('rota antiga de criação de conta redireciona para o cadastro funcional', async ({ page }) => {
  await page.goto('/criar-conta');
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page.getByPlaceholder('Nome da Empresa')).toBeVisible();
});

test('rota antiga preserva parametros comerciais e do plano', async ({ page }) => {
  await page.goto('/criar-conta?planId=plan-demo&seats=5&ref=vendedor-demo');
  await expect(page).toHaveURL(/\/cadastro\?planId=plan-demo&seats=5&ref=vendedor-demo$/);
  await expect(page.getByPlaceholder('Quantidade de usuários')).toHaveValue('5');
});

test('cadastro expõe plano, licenças e cupom sem overflow horizontal', async ({ page }) => {
  await page.goto('/cadastro');
  await expect(page.getByPlaceholder('Nome da Empresa')).toBeVisible();
  await expect(page.getByPlaceholder('Quantidade de usuários')).toBeVisible();
  await expect(page.getByPlaceholder('Cupom promocional (opcional)')).toBeVisible();
  await expect(page.getByText(/pelo menos 10 caracteres/i)).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
