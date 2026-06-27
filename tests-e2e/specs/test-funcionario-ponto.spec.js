const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Prova Real: Funcionario validando aba Ponto', () => {
  const screenshotDir = path.join(__dirname, '..', 'screenshots', 'prova-real');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  const TIMEOUT = 10000;

  async function performLogin(page, email, password) {
    await page.goto('/login');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await page.click('button[type="submit"], button:has-text("Entrar")');
    await page.waitForURL(/.*dashboard.*/, { timeout: TIMEOUT });
    await page.waitForLoadState('networkidle');
  }

  async function aceitarTermosSeExistir(page) {
    const termsModal = page.locator('text=/Termos de Uso|Política de Privacidade/i').first();
    if (await termsModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.evaluate(() => window.scrollBy(0, 10000));
      const checkbox = page.locator('input[type="checkbox"]');
      if (await checkbox.count() > 0) {
        await checkbox.first().check({ force: true });
      }
      await page.click('button:has-text("Continuar"), button:has-text("Aceitar")');
      await page.waitForTimeout(1000);
    }
  }

  test('Validando visão de Ponto e Ocorrencias para Funcionario', async ({ page }) => {
    // Entrando como funcionario padrão
    await performLogin(page, 'funcionario.teste@innovation.local', 'Teste@123');
    await aceitarTermosSeExistir(page);

    // Navegando para o controle de ponto
    await page.goto('/dashboard/time-track');
    await page.waitForTimeout(3000); // Dar tempo para a tabela montar

    // Bater o Ponto para garantir que há marcação no dia de hoje
    const btnBaterPonto = page.locator('a:has-text("BATER PONTO")');
    if (await btnBaterPonto.isVisible()) {
      await btnBaterPonto.click();
      await page.waitForTimeout(2000);
      
      const btnConfirmar = page.locator('button:has-text("REGISTRAR PONTO")');
      if (await btnConfirmar.isVisible()) {
        await btnConfirmar.click();
        await page.waitForTimeout(3000);
      }
      
      // Voltar para a aba de Ponto
      await page.goto('/dashboard/time-track');
      await page.waitForTimeout(3000);
    }

    // Tirar print da tabela de Ponto
    await page.screenshot({ path: path.join(screenshotDir, '01-func-ponto-grid-com-marcacao.png'), fullPage: true });

    // Tentar clicar na aba "Ocorrências" (agora deve estar visível!)
    const abaOcorrencias = page.locator('button:has-text("Ocorrências")').first();
    if (await abaOcorrencias.isVisible()) {
      await abaOcorrencias.click();
      await page.waitForTimeout(2000);
      
      // Tirar print das ocorrências
      await page.screenshot({ path: path.join(screenshotDir, '02-func-ocorrencias-lista.png'), fullPage: true });
    } else {
      console.log("Aba de Ocorrências não encontrada na tela do Funcionário!");
    }
  });
});
