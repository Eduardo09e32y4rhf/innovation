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
  await expect(page.getByRole('link', { name: 'Criar minha empresa' })).toHaveAttribute('href', '/cadastro');
  await expect(page.getByRole('link', { name: 'Voltar para o site' })).toHaveAttribute('href', '/');
});

test('cadastro expõe plano, licenças e cupom sem overflow horizontal', async ({ page }) => {
  await page.goto('/cadastro');
  await expect(page.getByPlaceholder('Nome da Empresa')).toBeVisible();
  await expect(page.getByPlaceholder('Quantidade de usuários')).toBeVisible();
  await expect(page.getByPlaceholder('Cupom promocional (opcional)')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
