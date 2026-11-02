import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

// INF-12: check-schema-drift.sh. Banco real da VPS NAO e acessivel aqui: o docker e simulado por stub.
const script = readFileSync(resolve('scripts/deploy/check-schema-drift.sh'), 'utf8');
const update = readFileSync(resolve('scripts/deploy/vps-update.sh'), 'utf8');
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

function run(diffOutput: string, execStatus = 0) {
  const dir = mkdtempSync(join(tmpdir(), 'drift-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'bin')); mkdirSync(join(dir, 'scripts/deploy'), { recursive: true });
  writeFileSync(join(dir, 'scripts/deploy/check-schema-drift.sh'), script);
  writeFileSync(join(dir, 'docker-compose.prod.yml'), 'services: {}\n');
  writeFileSync(join(dir, 'diff.txt'), diffOutput);
  writeFileSync(join(dir, 'bin/docker'), `#!/usr/bin/env bash
echo "docker $*" >> "${dir}/calls"
if [[ "$*" == *"@prisma/client/package.json"* ]]; then echo 6.19.3; exit 0; fi
if [[ "$*" == *"migrate diff"* ]]; then cat "${dir}/diff.txt"; exit ${execStatus}; fi
`, { mode: 0o755 });
  chmodSync(join(dir, 'bin/docker'), 0o755);
  const r = spawnSync('bash', ['scripts/deploy/check-schema-drift.sh'], { cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${dir}/bin:${process.env.PATH}` } });
  return { ...r, calls: (() => { try { return readFileSync(join(dir, 'calls'), 'utf8'); } catch { return ''; } })() };
}

describe('check-schema-drift.sh', () => {
  it('usa prisma migrate diff somente leitura dentro do container da API, do banco para o schema.prisma', () => {
    expect(script).toMatch(/migrate diff/);
    expect(script).toMatch(/--from-url "\$DATABASE_URL"/);
    expect(script).toMatch(/--to-schema-datamodel prisma\/schema\.prisma/);
    expect(script).toMatch(/--script/);
    expect(script).toMatch(/exec -T[^\n]* api /);
    expect(script).not.toMatch(/migrate (deploy|resolve|dev|reset)|db push|db execute/);
  });
  it('vazio (so comentario) retorna 0', () => {
    const r = run('-- This is an empty migration.\n');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('sem drift');
  });
  it('ignora a tabela _manual_migrations (nao existe no schema.prisma por desenho)', () => {
    expect(run('-- DropTable\nDROP TABLE "_manual_migrations";\n').status).toBe(0);
  });
  it('qualquer outra diferenca retorna 1 e mostra o SQL', () => {
    const r = run('-- AlterTable\nALTER TABLE "User" ADD COLUMN "x" TEXT;\n');
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('ALTER TABLE "User" ADD COLUMN "x" TEXT;');
  });
  it('falha do prisma (ex.: sem rede/CLI) retorna 2, nunca "sem drift"', () => {
    const r = run('', 1);
    expect(r.status).toBe(2);
    expect(r.stdout).not.toContain('sem drift');
  });
});

describe('vps-update.sh chama o drift como aviso NAO bloqueante, no final', () => {
  it('apos o deploy saudavel e com || para nao falhar', () => {
    const i = update.indexOf('check-schema-drift.sh');
    expect(i).toBeGreaterThan(update.indexOf('Deploy saudável'));
    expect(update.slice(i, i + 200)).toMatch(/\|\|\s*echo\s+'?"?AVISO/);
  });
});
