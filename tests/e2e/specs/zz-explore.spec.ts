import { test } from '../fixtures';
import { WEB_URL } from '../helpers/env';

test('explore', async ({ adminPage: page, adminSession }) => {
  const T = adminSession.tenant;
  console.log('LOGINS_USADOS', adminSession.logins);
  const info = async (label: string) => {
    const dlg = page.locator('[role=dialog]:visible');
    const dBtns = await dlg.locator('button').evaluateAll(els => els.map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40)));
    console.log(label, 'dialog botoes', JSON.stringify(dBtns), 'texto:', (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 260));
  };
  await page.goto(`${WEB_URL}/${T}/dashboard/employees`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await info('EMPLOYEES');
  const dlgBtn = page.locator('[role=dialog]:visible button').first();
  if (await dlgBtn.count()) { await dlgBtn.click(); await page.waitForTimeout(800); }
  await page.getByRole('button', { name: 'Ações de Ana Silva' }).click();
  await page.waitForTimeout(600);
  const items = await page.locator('[role=menuitem]:visible, [role=menu] button:visible, [role=menu] a:visible').evaluateAll(els => els.map(e => (e.textContent || '').trim().slice(0, 40)));
  console.log('MENU acoes', JSON.stringify(items));
  await page.keyboard.press('Escape');
  for (const p of ['vacations', 'time-track', 'ponto']) {
    await page.goto(`${WEB_URL}/${T}/dashboard/${p}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(6000);
    console.log(p.toUpperCase(), 'url', page.url().replace(T, ':t'), '| main:', (await page.locator('main').innerText().catch(() => 'SEM <main>')).replace(/\s+/g, ' ').slice(0, 300));
    console.log(p.toUpperCase(), 'body:', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 160));
  }
});
