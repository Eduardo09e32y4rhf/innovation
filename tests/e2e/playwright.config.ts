import { defineConfig } from '@playwright/test';
import { WEB_URL } from './helpers/env';

// Chromium do container (build 1194 / Playwright 1.56). Sem webkit/firefox: ver README.md.
const executablePath = process.env.E2E_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './specs',
  globalSetup: './helpers/global-setup.ts',
  // Uma sessao por usuario, compartilhada: o login aceita 5 tentativas/15 min e o refresh token rotaciona (reuso derruba a familia).
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['json', { outputFile: 'reports/results.json' }]],
  use: {
    baseURL: WEB_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath },
  },
  projects: [{ name: 'chromium', use: { viewport: { width: 1280, height: 800 } } }],
});
