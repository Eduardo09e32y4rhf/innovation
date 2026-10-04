import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/unit/**/*.spec.ts',
      'tests/contract/**/*.spec.ts',
      'tests/security/**/*.spec.ts',
      'apps/api/tests/unit/**/*.spec.ts',
      'apps/api/src/**/*.spec.ts'
    ],
    exclude: ['node_modules', 'dist', 'tests/integration', 'tests-e2e'],
    setupFiles: ['./scripts/test/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['apps/api/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.module.ts', '**/main.ts', '**/*.dto.ts'],
      // Piso inicial; suba conforme a cobertura real (rode `npm run test:coverage` e ajuste).
      thresholds: { lines: 15, functions: 15, statements: 15, branches: 10 }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/api/src'),
      '@prisma/client': path.resolve(__dirname, './apps/api/node_modules/@prisma/client'),
    },
  },
});
