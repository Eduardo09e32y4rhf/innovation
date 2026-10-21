import { test as base, type Page } from '@playwright/test';
import { openSession, type Session } from './helpers/session';

type WorkerFixtures = { adminSession: Session; funcSession: Session };
type TestFixtures = { adminPage: Page; funcPage: Page };

export const test = base.extend<TestFixtures, WorkerFixtures>({
  adminSession: [async ({ browser }, use) => {
    const session = await openSession(browser, 'admin');
    await use(session);
    await session.save();
    await session.context.close();
  }, { scope: 'worker' }],
  funcSession: [async ({ browser }, use) => {
    const session = await openSession(browser, 'func');
    await use(session);
    await session.save();
    await session.context.close();
  }, { scope: 'worker' }],
  adminPage: async ({ adminSession }, use) => {
    const page = await adminSession.context.newPage();
    await use(page);
    await adminSession.save();
    await page.close();
  },
  funcPage: async ({ funcSession }, use) => {
    const page = await funcSession.context.newPage();
    await use(page);
    await funcSession.save();
    await page.close();
  },
});

export { expect } from '@playwright/test';
