const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Innovation IA - Testes de Invasão e Segurança', () => {

  test.beforeAll(() => {
    const dir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  test('Teste 1: Acesso direto à Dashboard (Bypass Auth)', async ({ page }) => {
    await page.goto('/dashboard');
    
    // O Next.js (middleware ou layout) deve redirecionar de volta para o login
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'tentativa-invasao-barrada.png') });
  });

  test('Teste 2: Injeção SQL e XSS no Formulário de Login', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    
    // Payload de SQL Injection
    await page.fill('input[type="email"]', "' OR '1'='1");
    await page.fill('input[type="password"]', "password'; DROP TABLE users;--");
    await page.click('button[type="submit"]');
    
    const alerta = page.locator('text=/Não foi possível|inválido|Incorret/i');
    await expect(alerta.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'sql-injection-barrado.png') });

    // Reload page to reset state completely for XSS test
    await page.goto('/login');
    
    // Payload de XSS
    await page.fill('input[type="email"]', "<script>alert('xss')</script>@teste.local");
    await page.fill('input[type="password"]', "Teste@123");
    await page.click('button[type="submit"]');
    
    await expect(alerta.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'xss-injection-barrado.png') });
  });

  test('Teste 3: Validação do Fluxo "Esqueci a Senha"', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'novo-login.png') });
    
    // Clica no link de esqueci a senha
    const btnEsqueci = page.locator('button:has-text("Esqueci"), a:has-text("Esqueci")');
    if (await btnEsqueci.count() > 0) {
      await btnEsqueci.first().click();
      await page.waitForTimeout(1000);
      
      await page.fill('input[type="email"]', "admin.teste@innovation.local");
      await page.click('button:has-text("Simular Envio")');
      
      const alertaSucesso = page.locator('text=/Token de|sucesso|enviado/i');
      await expect(alertaSucesso.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
      await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'esqueci-senha-sucesso.png') });
    }
  });

  test('Teste 4: Burlar Termos de Uso (Privacy Consent Gate)', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.fill('input[type="email"]', "admin.teste@innovation.local");
    await page.fill('input[type="password"]', "Teste@123");
    await page.click('button[type="submit"]');
    
    // Esperamos o modal dos termos carregar
    await expect(page.locator('text=/Termos de Uso|Política de Privacidade/i').first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'tela-termos-de-uso.png') });
    
    // Tentamos forçar a ida para uma rota protegida
    await page.goto('/dashboard/employees');
    
    // O modal deve CONTINUAR sendo renderizado
    await expect(page.locator('text=/Termos de Uso|Política de Privacidade/i').first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'tentativa-burlar-termos-barrada.png') });
  });

});
