import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPOSE_API_PASSTHROUGH_ENV, COMPOSE_WEB_BUILD_ARGS } from '../../apps/api/src/config/env.validation';

const RAIZ = join(__dirname, '../..');
const compose = readFileSync(join(RAIZ, 'docker-compose.prod.yml'), 'utf8');
const dockerfileWeb = readFileSync(join(RAIZ, 'apps/web/Dockerfile'), 'utf8');
const envExample = readFileSync(join(RAIZ, '.env.example'), 'utf8');

/** Recorta o bloco de um servico (de `  nome:` ate o proximo servico/secao de 2 espacos). */
function service(name: string): string {
  const start = compose.search(new RegExp(`^  ${name}:\\s*$`, 'm'));
  expect(start, `servico ${name}`).toBeGreaterThanOrEqual(0);
  const rest = compose.slice(compose.indexOf('\n', start) + 1);
  const next = rest.search(/^ {0,2}\S[^\n]*:\s*$/m);
  return next < 0 ? rest : rest.slice(0, next);
}
const apiBlock = service('api');
const webBlock = service('web');

function sources(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) { if (n !== 'node_modules' && n !== 'dist') sources(f, out); }
    else if (n.endsWith('.ts') && !n.endsWith('.spec.ts')) out.push(f);
  }
  return out;
}
const apiCode = sources(join(RAIZ, 'apps/api/src')).map((f) => readFileSync(f, 'utf8')).join('\n');

describe('docker-compose.prod.yml repassa a API as variaveis que o codigo le', () => {
  for (const [name, def] of Object.entries(COMPOSE_API_PASSTHROUGH_ENV)) {
    it(`${name}: repassada como \${${name}:-${def}} e realmente lida pela API`, () => {
      // FEATURE_* e montada por featureEnvName() (feature-flags.ts), sem literal no codigo
      if (!name.startsWith('FEATURE_')) expect(apiCode, `${name} nao e mais lida: remova de COMPOSE_API_PASSTHROUGH_ENV`).toMatch(new RegExp(`\\b${name}\\b`));
      expect(apiBlock).toContain(`      ${name}: \${${name}:-${def}}`);
      expect(envExample, `${name} ausente de .env.example`).toMatch(new RegExp(`^#?\\s*${name}=`, 'm'));
    });
  }
});

describe('web: variaveis NEXT_PUBLIC_* entram como build args', () => {
  for (const [name, def] of Object.entries(COMPOSE_WEB_BUILD_ARGS)) {
    it(`${name}: build arg no compose e ARG/ENV no Dockerfile`, () => {
      expect(webBlock).toContain(`        ${name}: \${${name}:-${def}}`);
      expect(dockerfileWeb).toMatch(new RegExp(`^ARG ${name}\\b`, 'm'));
      expect(dockerfileWeb).toMatch(new RegExp(`^ENV ${name}=\\$${name}`, 'm'));
      expect(envExample, `${name} ausente de .env.example`).toMatch(new RegExp(`^#?\\s*${name}=`, 'm'));
    });
  }
});
