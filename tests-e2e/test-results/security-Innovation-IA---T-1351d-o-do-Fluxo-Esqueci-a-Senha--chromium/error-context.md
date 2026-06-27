# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: security.spec.js >> Innovation IA - Testes de Invasão e Segurança >> Teste 3: Validação do Fluxo "Esqueci a Senha"
- Location: specs\security.spec.js:49:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Simular Envio")')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - main [ref=e3]:
    - generic [ref=e4]:
      - link "Voltar ao login" [ref=e5] [cursor=pointer]:
        - /url: /login
        - img [ref=e6]
        - text: Voltar ao login
      - img [ref=e9]
      - heading "Esqueci minha senha" [level=1] [ref=e12]
      - paragraph [ref=e13]: Informe seu e-mail para iniciar a redefini??o de senha com token tempor?rio.
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: E-mail
          - generic [ref=e17]:
            - img [ref=e18]
            - textbox "E-mail" [active] [ref=e21]: admin.teste@innovation.local
        - button "Solicitar redefini??o" [ref=e22] [cursor=pointer]
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | const fs = require('fs');
  3  | const path = require('path');
  4  | 
  5  | test.describe('Innovation IA - Testes de Invasão e Segurança', () => {
  6  | 
  7  |   test.beforeAll(() => {
  8  |     const dir = path.join(__dirname, '..', 'screenshots');
  9  |     if (!fs.existsSync(dir)){
  10 |       fs.mkdirSync(dir, { recursive: true });
  11 |     }
  12 |   });
  13 | 
  14 |   test('Teste 1: Acesso direto à Dashboard (Bypass Auth)', async ({ page }) => {
  15 |     await page.goto('/dashboard');
  16 |     
  17 |     // O Next.js (middleware ou layout) deve redirecionar de volta para o login
  18 |     await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  19 |     
  20 |     await page.waitForTimeout(1000);
  21 |     await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'tentativa-invasao-barrada.png') });
  22 |   });
  23 | 
  24 |   test('Teste 2: Injeção SQL e XSS no Formulário de Login', async ({ page }) => {
  25 |     await page.goto('/login');
  26 |     await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  27 |     
  28 |     // Payload de SQL Injection
  29 |     await page.fill('input[type="email"]', "' OR '1'='1");
  30 |     await page.fill('input[type="password"]', "password'; DROP TABLE users;--");
  31 |     await page.click('button[type="submit"]');
  32 |     
  33 |     const alerta = page.locator('text=/Não foi possível|inválido|Incorret/i');
  34 |     await expect(alerta.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  35 |     await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'sql-injection-barrado.png') });
  36 | 
  37 |     // Reload page to reset state completely for XSS test
  38 |     await page.goto('/login');
  39 |     
  40 |     // Payload de XSS
  41 |     await page.fill('input[type="email"]', "<script>alert('xss')</script>@teste.local");
  42 |     await page.fill('input[type="password"]', "Teste@123");
  43 |     await page.click('button[type="submit"]');
  44 |     
  45 |     await expect(alerta.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  46 |     await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'xss-injection-barrado.png') });
  47 |   });
  48 | 
  49 |   test('Teste 3: Validação do Fluxo "Esqueci a Senha"', async ({ page }) => {
  50 |     await page.goto('/login');
  51 |     await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  52 |     
  53 |     await page.waitForTimeout(1500);
  54 |     await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'novo-login.png') });
  55 |     
  56 |     // Clica no link de esqueci a senha
  57 |     const btnEsqueci = page.locator('button:has-text("Esqueci"), a:has-text("Esqueci")');
  58 |     if (await btnEsqueci.count() > 0) {
  59 |       await btnEsqueci.first().click();
  60 |       await page.waitForTimeout(1000);
  61 |       
  62 |       await page.fill('input[type="email"]', "admin.teste@innovation.local");
> 63 |       await page.click('button:has-text("Simular Envio")');
     |                  ^ Error: page.click: Test timeout of 30000ms exceeded.
  64 |       
  65 |       const alertaSucesso = page.locator('text=/Token de|sucesso|enviado/i');
  66 |       await expect(alertaSucesso.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  67 |       await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'esqueci-senha-sucesso.png') });
  68 |     }
  69 |   });
  70 | 
  71 |   test('Teste 4: Burlar Termos de Uso (Privacy Consent Gate)', async ({ page }) => {
  72 |     await page.goto('/login');
  73 |     await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  74 |     await page.fill('input[type="email"]', "admin.teste@innovation.local");
  75 |     await page.fill('input[type="password"]', "Teste@123");
  76 |     await page.click('button[type="submit"]');
  77 |     
  78 |     // Esperamos o modal dos termos carregar
  79 |     await expect(page.locator('text=/Termos de Uso|Política de Privacidade/i').first()).toBeVisible({ timeout: 15000 }).catch(() => {});
  80 |     await page.waitForTimeout(1000);
  81 |     await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'tela-termos-de-uso.png') });
  82 |     
  83 |     // Tentamos forçar a ida para uma rota protegida
  84 |     await page.goto('/dashboard/employees');
  85 |     
  86 |     // O modal deve CONTINUAR sendo renderizado
  87 |     await expect(page.locator('text=/Termos de Uso|Política de Privacidade/i').first()).toBeVisible({ timeout: 15000 }).catch(() => {});
  88 |     await page.waitForTimeout(1000);
  89 |     await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'tentativa-burlar-termos-barrada.png') });
  90 |   });
  91 | 
  92 | });
  93 | 
```