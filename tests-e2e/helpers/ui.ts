import type { Page } from '@playwright/test';

/** Termo de uso do primeiro acesso: o checkbox so habilita depois de rolar o texto ate o fim. */
export async function acceptTermsIfShown(page: Page): Promise<boolean> {
  const sign = page.getByRole('button', { name: /Assinar termo/ });
  if (!(await sign.isVisible().catch(() => false))) return false;
  await page.locator('article').first().evaluate((el) => { const box = el.parentElement!; box.scrollTop = box.scrollHeight; });
  await page.locator('input[type=checkbox]').first().check();
  await sign.click();
  await sign.waitFor({ state: 'detached', timeout: 30_000 });
  return true;
}

/** Modal "Seja muito bem-vindo(a)" do primeiro acesso. */
export async function dismissWelcomeIfShown(page: Page): Promise<boolean> {
  const modal = page.getByText('PRIMEIRO ACESSO').first();
  if (!(await modal.isVisible().catch(() => false))) return false;
  const close = page.getByRole('button', { name: /Fechar|Pular|Agora não|Entendi|Começar|Continuar|Concluir/i }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  else await page.keyboard.press('Escape');
  return true;
}

export async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined);
  await acceptTermsIfShown(page);
  await dismissWelcomeIfShown(page);
}

export async function visit(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await settle(page);
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
}

/** Respostas da API com erro, separando o 401 do bootstrap da sessao (token so em memoria) dos erros reais. */
export function watchApi(page: Page, apiUrl: string) {
  const serverErrors: string[] = [];
  const unauthorized: string[] = [];
  const pageErrors: string[] = [];
  page.on('response', (res) => {
    const url = res.url();
    if (!url.startsWith(apiUrl)) return;
    const line = `${res.status()} ${res.request().method()} ${url.slice(apiUrl.length)}`;
    if (res.status() >= 500) serverErrors.push(line);
    else if (res.status() === 401) unauthorized.push(line);
  });
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 160)));
  return { serverErrors, unauthorized, pageErrors };
}
