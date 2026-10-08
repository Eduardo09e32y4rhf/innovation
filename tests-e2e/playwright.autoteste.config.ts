import { defineConfig } from '@playwright/test';

/** Autoteste dos auxiliares do robô (sem subir o app): npx playwright test --config playwright.autoteste.config.ts */
export default defineConfig({ testDir: './autoteste', timeout: 30_000, reporter: [['list']], use: { browserName: 'chromium' } });
