import fs from 'node:fs';
import path from 'node:path';
import { expect, type Browser, type BrowserContext } from '@playwright/test';
import { PASSWORD, USERS, VIEWPORT, VIEWPORT_KEY, WEB_URL, type UserKey } from './env';
import { settle } from './ui';

const AUTH_DIR = path.join(__dirname, '..', '.auth');

export type Session = { context: BrowserContext; tenant: string; who: UserKey; logins: number; save: () => Promise<void> };

const contextOptions = {
  viewport: VIEWPORT,
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  permissions: ['geolocation'],
  geolocation: { latitude: -23.55, longitude: -46.63 },
};

const tenantOf = (url: string) => new URL(url).pathname.split('/')[1];

/**
 * Uma unica sessao por usuario. O login aceita 5 tentativas/15 min e o refresh token rotaciona (reapresentar um
 * cookie ja rotacionado derruba a familia inteira), entao o cookie e regravado em .auth/<usuario>.json depois de cada teste
 * e a proxima execucao reaproveita a sessao sem novo login.
 */
export async function openSession(browser: Browser, who: UserKey): Promise<Session> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const file = path.join(AUTH_DIR, `${who}-${VIEWPORT_KEY}.json`);
  let logins = 0;
  let context: BrowserContext | null = null;
  let tenant = '';

  const metaFile = path.join(AUTH_DIR, `${who}-${VIEWPORT_KEY}.meta.json`);
  if (fs.existsSync(file) && fs.existsSync(metaFile)) {
    const savedTenant = JSON.parse(fs.readFileSync(metaFile, 'utf8')).tenant as string;
    const reused = await browser.newContext({ ...contextOptions, storageState: file });
    const page = await reused.newPage();
    // O access token fica so em memoria: abrir o painel faz o refresh pelo cookie (e o rotaciona).
    await page.goto(`${WEB_URL}/${savedTenant}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL((u) => u.pathname.startsWith(`/${savedTenant}/`) || u.pathname.startsWith('/login'), { timeout: 60_000 }).catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    if (new URL(page.url()).pathname.startsWith(`/${savedTenant}/`)) {
      tenant = savedTenant;
      await settle(page);
      await page.close();
      context = reused;
    } else {
      await reused.close();
    }
  }

  if (!context) {
    context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    await page.goto(`${WEB_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    const submit = page.locator('button[type=submit]');
    // Em dev o React hidrata depois do HTML: preenche de novo ate o botao habilitar.
    await expect(async () => {
      await page.locator('#login-email').fill(USERS[who].email);
      await page.locator('input[name=password]').fill(PASSWORD);
      await expect(submit).toBeEnabled({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await submit.click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90_000 });
    logins += 1;
    tenant = tenantOf(page.url());
    await settle(page);
    await page.close();
  }

  const ctx = context;
  const save = async () => {
    await ctx.storageState({ path: file });
    fs.writeFileSync(metaFile, JSON.stringify({ tenant }));
  };
  await save();
  return { context: ctx, tenant, who, logins, save };
}
