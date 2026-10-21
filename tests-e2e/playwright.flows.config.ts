import { defineConfig } from '@playwright/test';
import { VIEWPORT, WEB_URL } from './helpers/env';

/**
 * Fumaça dos fluxos logados (API e front reais). A API e o front precisam estar no ar (ver README.md).
 * Tela: E2E_VIEWPORT=1280x800 (padrao) ou E2E_VIEWPORT=360x740 para o celular.
 */
export default defineConfig({
  testDir: './flows',
  globalSetup: './helpers/global-setup.ts',
  // Uma sessao por usuario: o login aceita 5 tentativas/15 min e o refresh token rotaciona (reuso derruba a familia).
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: WEB_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: VIEWPORT,
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Opcional: aponta para um Chromium ja instalado (por exemplo, o do container de desenvolvimento).
    launchOptions: process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium' }],
});
