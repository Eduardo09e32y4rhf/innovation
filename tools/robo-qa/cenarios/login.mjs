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