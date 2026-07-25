import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'tests-e2e', 'tests/unit', 'tests/contract', 'tests/security'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false, // Sequencial para não causar colisão em banco de dados isolado
    setupFiles: ['./scripts/test/vitest.setup.ts'],
  },
  esbuild: false,
  oxc: false,
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/api/src'),
      '@prisma/client': path.resolve(__dirname, './apps/api/node_modules/@prisma/client'),
    },
  },
});
