import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * L11 (docs/ESCOPO-PRODUCAO-V1.md): nenhum seed de demonstracao pode rodar com NODE_ENV=production.
 *
 * Cada seed versionado precisa estar classificado aqui:
 *  - catalogo: dado de producao legitimo (planos e precos), sem guarda;
 *  - demo: cria empresa/usuarios/funcionarios ficticios, ENTAO precisa recusar rodar em producao
 *    com um `if (process.env.NODE_ENV === 'production')` no TOPO do arquivo (coluna 0) que encerre o processo,
 *    ou checar que o banco e o de teste;
 *  - sql-dev: SQL de E2E que so existe para dev/staging (qualquer seed sob tests/e2e ou tests-e2e e aceito por prefixo).
 *
 * `gap: true` = defeito conhecido (o seed ainda nao tem a guarda). O caso usa `it.fails`: fica verde enquanto o
 * defeito existe e FALHA quando alguem adicionar a guarda; nesse momento troque `gap` para false.
 */
const ROOT = path.resolve(__dirname, '../../');

type Seed = { file: string; kind: 'catalogo' | 'demo'; gap?: boolean; note: string };

const SEEDS: Seed[] = [
  { file: 'apps/api/prisma/seed-plans-catalog.ts', kind: 'catalogo', note: 'catalogo de planos' },
  { file: 'apps/api/prisma/seed-pricing.ts', kind: 'catalogo', note: 'precos' },
  {
    file: 'apps/api/prisma/seed-admin.cjs',
    kind: 'demo',
    gap: true,
    note: 'cria "Empresa Demo" (documento 00000000000191), o admin dela e o usuario DEV; em producao so exige variaveis fortes, nao bloqueia a empresa demo. infra/render.yaml o executa a cada subida',
  },
  { file: 'apps/api/prisma/seed-realistic-demo.ts', kind: 'demo', gap: true, note: 'dezenas de funcionarios e usuarios ficticios (@innovation.com); sem nenhuma guarda de ambiente' },
  { file: 'apps/api/test/e2e-seed.ts', kind: 'demo', gap: true, note: 'usuarios dev@/comercial@innovation.com para E2E; sem guarda de ambiente' },
  { file: 'scripts/test/seed-test-data.ts', kind: 'demo', note: 'protegido: aborta se DATABASE_URL nao for o banco de teste (porta 5436)' },
];

const SEED_FILE = /(^|\/)(seed[^/]*|[^/]*-seed)\.(ts|cjs|js|sql|py)$/;
// Seeds de E2E (tests/e2e, tests-e2e) so existem para dev/staging e nao sao entregues na imagem de producao.
const IGNORED_PREFIXES = ['scripts/archive/', 'docs/', 'node_modules/', 'tests/security/', 'tests/e2e/', 'tests-e2e/'];

function read(file: string) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

/** Guarda no topo do arquivo (coluna 0), diferente da `requiredEnv` indentada do seed-admin. */
function hasTopLevelProductionGuard(source: string) {
  return /^if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*['"]production['"]/m.test(source);
}

function hasTestDatabaseGuard(source: string) {
  return /DATABASE_URL[\s\S]{0,120}includes\(\s*['"]5436['"]\s*\)[\s\S]{0,200}process\.exit\(1\)/.test(source);
}

describe('seeds: nenhum seed de demonstracao roda em producao', () => {
  it('todo seed versionado esta classificado (um seed novo precisa ser registrado aqui)', () => {
    const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n')
      .filter((file) => file && SEED_FILE.test(file) && !IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix)) && fs.existsSync(path.join(ROOT, file)));
    const registered = new Set(SEEDS.map((seed) => seed.file));
    expect(tracked.filter((file) => !registered.has(file))).toEqual([]);
  });

  it('todo seed registrado existe', () => {
    expect(SEEDS.filter((seed) => !fs.existsSync(path.join(ROOT, seed.file))).map((seed) => seed.file)).toEqual([]);
  });

  for (const seed of SEEDS.filter((item) => item.kind === 'demo')) {
    const run = seed.gap ? it.fails : it;
    run(`${seed.gap ? '[defeito aberto L11] ' : ''}${seed.file} recusa rodar em producao (${seed.note})`, () => {
      const source = read(seed.file);
      expect(hasTopLevelProductionGuard(source) || hasTestDatabaseGuard(source)).toBe(true);
    });
  }

  it('a guarda detecta o que deve e ignora a validacao de variaveis do seed-admin', () => {
    expect(hasTopLevelProductionGuard("if (process.env.NODE_ENV === 'production') {\n  process.exit(1);\n}")).toBe(true);
    expect(hasTopLevelProductionGuard("function requiredEnv(n) {\n  if (process.env.NODE_ENV === 'production' && !v) throw new Error(n);\n}")).toBe(false);
    expect(hasTestDatabaseGuard("if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('5436')) {\n  console.error('x');\n  process.exit(1);\n}")).toBe(true);
  });

  it('o seed-admin hoje exige variaveis fortes em producao (necessario, mas nao basta: ver defeito L11)', () => {
    expect(read('apps/api/prisma/seed-admin.cjs')).toMatch(/NODE_ENV === 'production'[\s\S]{0,120}Missing secure production environment variable/);
  });
});
