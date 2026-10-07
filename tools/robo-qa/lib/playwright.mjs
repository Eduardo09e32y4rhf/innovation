import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '../../..');

/** Reaproveita o Playwright que ja esta instalado em tests-e2e (nada novo para instalar). */
export function carregarPlaywright() {
  const require = createRequire(import.meta.url);
  const candidatos = [
    'playwright-core',
    'playwright',
    path.join(raiz, 'tests-e2e/node_modules/playwright-core'),
    path.join(raiz, 'tests-e2e/node_modules/playwright'),
    path.join(raiz, 'node_modules/playwright-core'),
  ];
  for (const candidato of candidatos) {
    try {
      const modulo = require(candidato);
      if (modulo?.chromium) return modulo;
    } catch { /* tenta o proximo */ }
  }
  throw new Error('Playwright nao encontrado. Rode: cd tests-e2e && npm install && npx playwright install chromium');
}