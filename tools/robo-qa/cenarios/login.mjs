import { clicar, digitar, ir } from '../lib/acoes.mjs';

/** Entra no sistema como o perfil. Devolve o "tenant" (empresa) que aparece na URL. */
export async function entrar(ctx, credencial) {
  const { page } = ctx;
  await ir(ctx, '/login', 'Abrindo a tela de login');
  await digitar(ctx, page.locator('#login-email'), credencial.email, 'campo E-mail');
  await digitar(ctx, page.locator('input[type="password"]'), credencial.senha, 'campo Senha');
  await clicar(ctx, page.getByRole('button', { name: /^entrar/i }), 'botão Entrar');

  const mfa = page.locator('input[aria-label="Código MFA"]');
  const chegou = await Promise.race([
    page.waitForURL(/\/(dashboard|ceo-onboarding|portal)(\/|$|\?)/, { timeout: 25000 }).then(() => 'entrou'),
    mfa.waitFor({ state: 'visible', timeout: 25000 }).then(() => 'mfa'),
  ]).catch(() => 'nada');

  if (chegou === 'mfa') throw new Error('ESPERADO: este perfil exige o código do aplicativo autenticador (MFA). O robô não consegue entrar sozinho. Use uma conta de teste sem MFA ou desative o MFA dela.');
  if (chegou !== 'entrou') {
    const aviso = await page.locator('[role="alert"], .text-rose-700, .text-red-600').first().innerText({ timeout: 1500 }).catch(() => '');
    throw new Error(`ESPERADO: o login deveria entrar no sistema, mas ficou na tela de login. ${aviso ? `Mensagem na tela: "${aviso.slice(0, 160)}". ` : ''}Confira e-mail e senha no arquivo de configuração.`);
  }
  const url = new URL(page.url());
  const tenant = url.pathname.split('/').filter(Boolean)[0] ?? '';
  return { tenant, onboardingCEO: url.pathname.startsWith('/ceo-onboarding') };
}

/** Encerra a sessão de forma explícita para provar que a conta seguinte não herda cookies. */
export async function sair(ctx) {
  if (/\/login(?:\/|$)/i.test(ctx.page.url())) return true;
  const candidatos = [
    ctx.page.getByRole('button', { name: /sair|logout|encerrar sess[aã]o/i }).first(),
    ctx.page.getByRole('menuitem', { name: /sair|logout|encerrar sess[aã]o/i }).first(),
    ctx.page.locator('[data-testid="logout"], [data-testid="qa-logout"]').first(),
  ];
  for (const alvo of candidatos) {
    if (await alvo.count().catch(() => 0)) {
      await alvo.click({ timeout: 5000 }).catch(() => {});
      await ctx.page.waitForURL(/\/login(?:\/|$)/i, { timeout: 5000 }).catch(() => {});
      return /\/login(?:\/|$)/i.test(ctx.page.url());
    }
  }
  return false;
}

