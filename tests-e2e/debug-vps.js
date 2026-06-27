const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const artifactDir = 'C:\\Users\\eduar\\.gemini\\antigravity\\brain\\5e222307-a978-4630-9f89-53e49621bbf1\\scratch';
  
  console.log('Iniciando navegador headless para debug...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  
  try {
    console.log('Acessando Admin...');
    await page.goto('https://vps8369.panel.icontainer.net:2090/admin', { timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(artifactDir, 'vps_step1_login_page.png') });
    
    // CyberPanel or similar
    await page.fill('input[type="text"], input[name="username"], input[name="user"]', 'vps8369');
    await page.fill('input[type="password"]', '575031eb86');
    await page.screenshot({ path: path.join(artifactDir, 'vps_step2_filled.png') });
    
    const btnLogin = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar")').first();
    await btnLogin.click();
    console.log('Login clicado');
    
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(artifactDir, 'vps_step3_after_login.png') });
    
    console.log('Acessando terminal...');
    await page.goto('https://vps8369.panel.icontainer.net:2090/hosts/terminal', { timeout: 60000 });
    await page.waitForTimeout(10000);
    await page.screenshot({ path: path.join(artifactDir, 'vps_step4_terminal.png') });
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await browser.close();
  }
})();
