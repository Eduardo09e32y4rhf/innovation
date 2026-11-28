import { defineConfig } from '@playwright/test';
import path from 'node:path';
export default defineConfig({
  testDir: './tests', testMatch: 'candidate-portal.spec.ts', timeout: 90_000,
  expect: { timeout: 15_000 }, workers: 1, retries: 0,
  reporter: [['list']], outputDir: '../storage/qa/portal-candidato/playwright',
  use: { baseURL: 'http://127.0.0.1:3107', headless: true, trace: 'off' },
  webServer: {
    cwd: path.resolve(__dirname, '../apps/web'),
    command: `node "${require.resolve('next/dist/bin/next', { paths: [path.resolve(__dirname, '../apps/web')] })}" dev --webpack --hostname 127.0.0.1 --port 3107`,
    url: 'http://127.0.0.1:3107/carreiras', reuseExistingServer: false, timeout: 180_000,
    env: { NEXT_PUBLIC_API_URL: '/api', NODE_OPTIONS: '--max-old-space-size=1024' },
  },
});
