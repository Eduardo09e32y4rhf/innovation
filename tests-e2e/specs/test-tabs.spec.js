const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const profiles = [
  {
    name: 'ADMIN',
    email: 'admin.teste@innovation.local',
    password: 'Teste@123',
    tabs: [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Funcionarios', url: '/dashboard/employees' },
      { name: 'Ponto', url: '/dashboard/time-track' },
      { name: 'Ferias', url: '/dashboard/vacations' },
      { name: 'Gestao', url: '/dashboard/management' },
      { name: 'Usuarios', url: '/dashboard/users' },
      { name: 'Configuracoes', url: '/dashboard/settings' }
    ]
  },
  {
    name: 'RH',
    email: 'rh.teste@innovation.local',
    password: 'Teste@123',
    tabs: [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Funcionarios', url: '/dashboard/employees' },
      { name: 'Ponto', url: '/dashboard/time-track' },
      { name: 'Ferias', url: '/dashboard/vacations' },
      { name: 'Gestao', url: '/dashboard/management' },
      { name: 'Configuracoes', url: '/dashboard/settings' }
    ]
  },
  {
    name: 'GESTOR',
    email: 'gestor.teste@innovation.local',
    password: 'Teste@123',
    tabs: [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Funcionarios', url: '/dashboard/employees' },
      { name: 'Ponto', url: '/dashboard/time-track' },
      { name: 'Ferias', url: '/dashboard/vacations' },
      { name: 'Gestao', url: '/dashboard/management' },
      { name: 'Configuracoes', url: '/dashboard/settings' }
    ]
  },
  {
    name: 'FUNCIONARIO',
    email: 'funcionario.teste@innovation.local',
    password: 'Teste@123',
    tabs: [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Ponto', url: '/dashboard/time-track' },
      { name: 'Ferias', url: '/dashboard/vacations' },
      { name: 'Configuracoes', url: '/dashboard/settings' }
    ]
  }
];

test.describe('Testando todas as abas por perfil', () => {
  const screenshotDir = path.join(__dirname, '..', 'screenshots', 'tabs');

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

  for (const profile of profiles) {
    test(`Validando abas do perfil ${profile.name}`, async ({ page }) => {
      // Admin might be Admin123! or Teste@123. Let's try both if admin
      if (profile.name === 'ADMIN') {
        await performLogin(page, profile.email, profile.password).catch(async () => {
          await performLogin(page, 'admin@innovation.local', 'Admin123!');
        });
      } else {
        await performLogin(page, profile.email, profile.password);
      }
      
      await aceitarTermosSeExistir(page);

      for (const tab of profile.tabs) {
        await page.goto(tab.url);
        await page.waitForTimeout(2000); // Aguarda a pagina carregar e estabilizar
        await page.screenshot({ path: path.join(screenshotDir, `${profile.name}-${tab.name}.png`), fullPage: true });
      }
    });
  }
});
