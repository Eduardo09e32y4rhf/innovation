const { chromium } = require('@playwright/test');

(async () => {
  console.log('🚀 Iniciando Robô de Deploy Automático na VPS (Modo Oculto)...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  
  try {
    console.log('🔑 Acessando Painel de Controle...');
    await page.goto('https://vps8369.panel.icontainer.net:2090/admin', { timeout: 60000 });
    
    console.log('Esperando o formulário de login...');
    await page.waitForTimeout(2000);
    
    const userInput = page.locator('input[type="text"], input[name="username"], input[name="user"]').first();
    const passInput = page.locator('input[type="password"], input[name="password"], input[name="pass"]').first();
    
    if (await userInput.count() > 0) {
       await userInput.fill('vps8369');
       await passInput.fill('575031eb86');
       
       // Click the terms checkbox!
       console.log('Clicando no aceite de termos...');
       const checkbox = page.locator('input[type="checkbox"]').first();
       if (await checkbox.count() > 0) {
          await checkbox.evaluate(node => node.click());
       }
       
       const btnLogin = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar")').first();
       await btnLogin.click();
       console.log('✅ Login clicado. Aguardando...');
    }
    
    await page.waitForTimeout(6000);
    
    console.log('💻 Navegando para o Web Terminal...');
    await page.goto('https://vps8369.panel.icontainer.net:2090/hosts/terminal', { timeout: 60000 });
    
    // Aguarda o terminal renderizar
    await page.waitForTimeout(8000);
    
    console.log('⚙️ Focando no terminal e injetando comandos...');
    
    // Foca no centro da janela
    await page.mouse.click(600, 400);
    await page.waitForTimeout(1000);
    
    // Para ter certeza que o terminal foca, enviamos alguns enters
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    const commands = [
      'cd /var/www/innovation.ia',
      'git pull origin main',
      'docker compose -f docker-compose.prod.yml --env-file .env build --no-cache',
      'docker compose -f docker-compose.prod.yml --env-file .env up -d',
      'docker compose -f docker-compose.prod.yml --env-file .env exec -T api npx prisma migrate deploy',
      'echo "DEPLOY_CONCLUIDO_COM_SUCESSO"'
    ];
    
    for (const cmd of commands) {
      console.log(`Rodando: ${cmd}`);
      await page.keyboard.type(cmd, { delay: 5 });
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000); 
    }
    
    // Aguarda o deploy rodar no terminal para dar tempo
    await page.waitForTimeout(15000); 
    
    console.log('✅ Sequência de Deploy finalizada.');
  } catch (error) {
    console.error('❌ Erro no robô de deploy:', error.message);
  } finally {
    await browser.close();
  }
})();
