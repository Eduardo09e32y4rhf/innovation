import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

const fixtures: string[] = [];
const sha = 'a'.repeat(40);
function run(scenario = '') {
  const dir = mkdtempSync(join(tmpdir(), 'innovation-deploy-'));
  fixtures.push(dir);
  for (const folder of ['bin', '.deploy', 'scripts/deploy', 'scripts/security', 'scripts/backup']) mkdirSync(join(dir, folder), { recursive: true });
  writeFileSync(join(dir, '.env'), 'TEST_FIXTURE=true\n');
  writeFileSync(join(dir, 'scripts/deploy/vps-update.sh'), readFileSync(resolve('scripts/deploy/vps-update.sh')));
  const stub = (name: string, body: string) => writeFileSync(join(dir, name), `#!/usr/bin/env bash\nset -eu\n${body}\n`, { mode: 0o755 });
  stub('scripts/security/bootstrap-env.sh', 'echo bootstrap >> "$DEPLOY_LOG"');
  stub('scripts/backup/backup.sh', 'echo backup >> "$DEPLOY_LOG"');
  stub('scripts/deploy/apply-migrations.sh', 'echo migrations >> "$DEPLOY_LOG"');
  stub('scripts/deploy/check-schema-drift.sh', 'echo drift-check >> "$DEPLOY_LOG"; if [ "$SCENARIO" = drift ]; then exit 1; fi');
  stub('bin/git', `if [ "$1" = rev-parse ]; then echo ${sha}; fi`);
  stub('bin/sleep', 'exit 0');
  stub('bin/docker', `
echo "api=$API_IMAGE web=$WEB_IMAGE docker $*" >> "$DEPLOY_LOG"
if [ "$1" = load ]; then cat >/dev/null; fi
if [ "$1" = inspect ]; then echo "sha256:old-$4"; fi
if [[ "$*" == *"ps -q api"* ]]; then echo api-container; fi
if [[ "$*" == *"ps -q web"* ]]; then echo web-container; fi
if [[ "$*" == *"run --rm"* ]] && [ "$SCENARIO" = preflight ]; then exit 1; fi
if [[ "$*" == *"exec -T api wget"* ]] && [ "$SCENARIO" = health ]; then exit 1; fi
`);
  const archive = gzipSync('fake Docker archive');
  writeFileSync(join(dir, '.deploy/images.tar.gz'), archive);
  writeFileSync(join(dir, '.deploy/images.tar.gz.sha256'), `${createHash('sha256').update(archive).digest('hex')}  images.tar.gz\n`);
  if (scenario === 'checksum') writeFileSync(join(dir, '.deploy/images.tar.gz'), 'corrupted archive');
  const result = spawnSync('bash', ['scripts/deploy/vps-update.sh', sha, '--prebuilt'], {
    cwd: dir, encoding: 'utf8', timeout: 10_000,
    env: { ...process.env, PATH: `${dir}/bin:${process.env.PATH}`, DEPLOY_LOG: join(dir, 'events'), SCENARIO: scenario },
  });
  return { ...result, log: readFileSync(join(dir, 'events'), 'utf8'), dir };
}
afterEach(() => { for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('deploy da VPS com imagens prontas', () => {
  it('valida antes do backup/migração e troca somente API/web sem compilar na VPS', () => {
    const result = run();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.log.indexOf('run --rm')).toBeLessThan(result.log.indexOf('backup'));
    expect(result.log.indexOf('backup')).toBeLessThan(result.log.indexOf('migrations'));
    expect(result.log.indexOf('migrations')).toBeLessThan(result.log.indexOf('up -d'));
    expect(result.log).not.toMatch(/docker .* build|--build|--remove-orphans|\bdown\b/);
    expect(readFileSync(join(result.dir, '.deploy/current-sha'), 'utf8').trim()).toBe(sha);
  });
  it('drift de schema (INF-12) roda ao final e e apenas aviso: nao derruba nem reverte o deploy', () => {
    const result = run('drift');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('AVISO: drift do schema');
    expect(result.log.indexOf('drift-check')).toBeGreaterThan(result.log.lastIndexOf('up -d'));
    expect(result.log).not.toMatch(/api=old/);
  });
  it('não altera banco ou containers quando a configuração é inválida', () => {
    const result = run('preflight');
    expect(result.status).not.toBe(0);
    expect(result.log).not.toContain('backup');
    expect(result.log).not.toContain('migrations');
    expect(result.log).not.toContain('up -d');
  });
  it('rejeita pacote corrompido antes de carregar as imagens', () => {
    const result = run('checksum');
    expect(result.status).not.toBe(0);
    expect(result.log).not.toContain('docker load');
    expect(result.log).not.toContain('migrations');
  });
  it('restaura as duas imagens anteriores se a API não ficar pronta', () => {
    const result = run('health');
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('Restaurando as imagens anteriores');
    expect(result.log).toContain('api=sha256:old-api-container web=sha256:old-web-container docker compose -f docker-compose.prod.yml up -d --no-build --no-deps api web');
    expect(result.log).not.toMatch(/DROP|restore|\bdown\b/);
  });

  it('lê caminhos com espaços do .env sem executar seu conteúdo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'innovation-env-'));
    fixtures.push(dir);
    writeFileSync(join(dir, '.env'), 'INVOICE_ISSUER_NAME=Minha Empresa\nBACKUP_DIR="/data/meus backups"\nBACKUP_REMOTE=$(touch compromised)\n');
    const source = readFileSync(resolve('scripts/deploy/env-options.sh'), 'utf8');
    writeFileSync(join(dir, 'options.sh'), source);
    const result = spawnSync('bash', ['-c', 'source ./options.sh; load_deploy_options BACKUP_DIR BACKUP_REMOTE; printf "%s|%s" "$BACKUP_DIR" "$BACKUP_REMOTE"; test ! -e compromised'], {
      cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('/data/meus backups|$(touch compromised)');
  });
});
