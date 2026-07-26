const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const credentials = {
  admin: 'admin.teste@innovation.local',
  rh: 'rh.teste@innovation.local',
  gestor: 'gestor.teste@innovation.local',
  funcionario: 'funcionario.teste@innovation.local',
  feriasDisponivel: 'ferias.disponivel@innovation.local',
  admissaoRecente: 'admissao.recente@innovation.local',
  consulta: 'consulta.teste@innovation.local',
  comercial: 'comercial.teste@innovation.local',
  desligado: 'desligado.teste@innovation.local',
  semAcesso: 'invalido@innovation.local'
};

const PASSWORD = 'Teste@123';
const TIMEOUT_OP = 15000;

function generateFakeCPF() {
  const n = () => Math.floor(Math.random() * 9);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

test.describe('Innovation IA - Testes Exploratórios e Agressivos', () => {

  test.beforeAll(() => {
    const dir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  async function performLogin(page, email, password = PASSWORD) {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.fill('input[type="email"], input[name="email"], #email', email);
    await page.fill('input[type="password"], input[name="password"], #password', password);
    await page.click('button[type="submit"], button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: TIMEOUT_OP });
  }

  test('1. Fluxo Admin/RH - Cadastro e Notificacao', async ({ page }) => {
    await performLogin(page, credentials.rh);
    
    // A. Criação de Funcionário
    await page.goto('/dashboard/employees');
    await page.waitForTimeout(2000);
    
    const btnNovo = page.locator('a[href="/dashboard/employees/new"], button:has-text("Novo"), button:has-text("Adicionar")').first();
    await btnNovo.waitFor({ state: 'visible', timeout: 5000 });
    if (true) {
        await btnNovo.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'rh-criando-usuario-antes.png') });
        
        // Input Genérico
        const allInputs = page.locator('input[type="text"]');
        expect(await allInputs.count()).toBeGreaterThan(1);
        if (true) {
          await allInputs.nth(0).fill('Automacao Playwright E2E');
          await allInputs.nth(1).fill(generateFakeCPF());
        }
        
        const emailInput = page.locator('input[type="email"]');
        expect(await emailInput.count()).toBeGreaterThan(0);
        if (true) {
          await emailInput.first().fill(`auto-${Date.now()}@teste.local`);
        }
        
        const admissionInputs = page.locator('input[type="date"]');
        expect(await admissionInputs.count()).toBeGreaterThan(0);
        if (true) {
            await admissionInputs.first().fill('2025-01-01');
        }
        
        await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'rh-criando-usuario-preenchido.png') });
        await page.click('button:has-text("SALVAR"), button:has-text("Salvar")');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'rh-usuario-criado-sucesso.png') });
    }

    // B. Envio de Notificação
    await page.goto('/dashboard/management');
    await page.waitForTimeout(2000);
    
    // Try to click Notificações tab if it exists
    const btnNotif = page.locator('button:has-text("Notific")');
    expect(await btnNotif.count()).toBeGreaterThan(0);
    if (true) {
        await btnNotif.first().click();
        await page.waitForTimeout(1000);
        const btnNovaNotif = page.locator('button:has-text("NOVA NOTIFICA")');
        expect(await btnNovaNotif.count()).toBeGreaterThan(0);
        if (true) {
           await btnNovaNotif.first().click();
           await page.waitForTimeout(500);
           await page.locator('input[type="text"]').first().fill('Alerta E2E Automatizado');
           await page.locator('textarea').first().fill('Mensagem disparada via Playwright!');
           await page.click('button:has-text("ENVIAR"), button:has-text("Enviar")');
           await page.waitForTimeout(1000);
        }
    }
  });

  test('2. Fluxo Gestor - Aprovação e Rejeição de Ponto', async ({ page }) => {
    await performLogin(page, credentials.gestor);
    await page.goto('/dashboard/time-track');
    await page.waitForTimeout(3000);
    
    const btnAprovar = page.locator('button:has-text("APROVAR")');
    expect(await btnAprovar.count()).toBeGreaterThan(0);
    if (true) {
      await btnAprovar.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'gestor-ponto-aprovado.png') });
    }

    const btnRecusar = page.locator('button:has-text("RECUSAR")');
    expect(await btnRecusar.count()).toBeGreaterThan(0);
    if (true) {
      await btnRecusar.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'gestor-ponto-recusado.png') });
    }
  });

  test('3. Fluxo Férias - Solicitação e Verificação do Gestor', async ({ browser }) => {
    const ctxFunc = await browser.newContext();
    const pageFunc = await ctxFunc.newPage();
    await performLogin(pageFunc, credentials.feriasDisponivel);
    
    await pageFunc.goto('/dashboard/vacations');
    await pageFunc.waitForTimeout(2000);
    
    const btnSol = pageFunc.locator('button:has-text("Solicitar Férias"), button:has-text("SOLICITAR"), a:has-text("Solicitar")');
    expect(await btnSol.count()).toBeGreaterThan(0);
    if (true) {
        await btnSol.first().click();
        await pageFunc.waitForTimeout(1000);
        
        await pageFunc.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'solicitacao-ferias-preenchendo.png') });
        
        const dtInputs = pageFunc.locator('input[type="date"]');
        expect(await dtInputs.count()).toBeGreaterThan(1);
        if (true) {
          await dtInputs.nth(0).fill('2026-12-01');
          await dtInputs.nth(1).fill('2026-12-15');
        }
        const txtObs = pageFunc.locator('textarea');
        expect(await txtObs.count()).toBeGreaterThan(0);
        if (true) {
          await txtObs.first().fill('Férias merecidas solicitadas via automação!');
        }
        
        await pageFunc.click('button:has-text("ENVIAR"), button:has-text("SALVAR"), button:has-text("SOLICITAR")');
        await pageFunc.waitForTimeout(2000);
        await pageFunc.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'solicitacao-ferias-enviada.png') });
    }
    await ctxFunc.close();

    const ctxGestor = await browser.newContext();
    const pageGestor = await ctxGestor.newPage();
    await performLogin(pageGestor, credentials.gestor);
    await pageGestor.goto('/dashboard/vacations');
    await pageGestor.waitForTimeout(2000);
    await pageGestor.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'gestor-verificando-ferias.png') });
    await ctxGestor.close();
  });

  test('4. Caça Ativa de Falhas - Consulta / Bloqueado', async ({ page }) => {
    await performLogin(page, credentials.consulta);
    await page.goto('/dashboard/employees');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'consulta-antes-forcar-botao.png') });
    
    const btnNovo = page.locator('button:has-text("Novo"), button:has-text("Adicionar")');
    expect(await btnNovo.count()).toBeGreaterThan(0);
    if (true) {
       await btnNovo.first().click({ force: true });
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'consulta-depois-forcar-botao.png') });

    await page.goto('/login');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    
    await page.fill('input[type="email"], input[name="email"], #email', credentials.desligado);
    await page.fill('input[type="password"], input[name="password"], #password', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Entrar")');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'bloqueado-stress.png') });
  });

});
