import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'path';

// Suíte de QA (funcionários): roda à parte do CI padrão. Uso: npm run test:qa:funcionarios
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/qa/**/*.spec.ts'],
    setupFiles: ['./scripts/test/vitest.setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Milhares de casos pequenos: reporter enxuto, detalhes no JSON.
    reporters: ['default'],
  },
  esbuild: false,
  oxc: false,
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/api/src'),
      '@prisma/client': path.resolve(__dirname, './apps/api/node_modules/@prisma/client'),
    },
  },
});
