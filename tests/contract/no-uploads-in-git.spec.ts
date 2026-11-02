import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');

// RS-D-01: envios de candidatos (curriculos, documentos) ficam em apps/api/data em tempo de execucao e
// nunca podem ser versionados (repositorio publico + dado pessoal = LGPD).
describe('envios de candidatos nunca entram no git', () => {
  it('nenhum arquivo versionado em apps/api/data', () => {
    const out = spawnSync('git', ['ls-files', 'apps/api/data'], { cwd: ROOT, encoding: 'utf8' });
    const tracked = out.stdout.split('\n').filter(Boolean);
    expect(tracked, `Remova do git (git rm --cached): ${tracked.slice(0, 3).join(', ')}`).toEqual([]);
  });

  it('o .gitignore cobre apps/api/data', () => {
    expect(readFileSync(join(ROOT, '.gitignore'), 'utf8')).toMatch(/^\/?apps\/api\/data\/?\s*$/m);
  });
});
