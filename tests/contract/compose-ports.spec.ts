import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

// INF-08 (ordem de subida/healthcheck) e INF-09 (compose legado/inseguro; o deploy so usa docker-compose.prod.yml).
const RAIZ = join(__dirname, '../..');
const read = (f: string) => readFileSync(join(RAIZ, f), 'utf8');
const compose = (f: string) => load(read(f)) as { services: Record<string, any> };

const composeFiles = [
  ...readdirSync(RAIZ).filter((f) => /^docker-compose.*\.ya?ml$/.test(f)),
  ...readdirSync(join(RAIZ, 'infra')).filter((f) => /^docker-compose.*\.ya?ml$/.test(f)).map((f) => `infra/${f}`),
];

describe('INF-09: nenhum compose publica porta fora de 127.0.0.1', () => {
  for (const file of composeFiles) {
    it(file, () => {
      for (const [name, svc] of Object.entries(compose(file).services)) {
        for (const p of svc.ports ?? []) {
          expect(String(p), `${file} ${name}`).toMatch(/^127\.0\.0\.1:/);
        }
      }
    });
  }
  it('nenhum compose usa docker.sock, privileged ou watchtower', () => {
    for (const file of composeFiles) {
      const text = read(file);
      expect(text, file).not.toMatch(/docker\.sock|privileged:\s*true|watchtower/);
    }
  });
});

describe('INF-09: legado fora de infra/ e deploy so usa docker-compose.prod.yml', () => {
  const legado = ['docker-compose.yml', 'docker-compose.locaweb.yml', 'Dockerfile.api', 'Dockerfile.web', 'nginx-web.conf', 'nginx-lb.conf', 'Caddyfile', 'render.yaml', 'ecosystem.config.cjs', 'locaweb.env.example'];
  for (const f of legado) {
    it(`infra/${f} nao existe mais em infra/ (movido para docs/legado/infra/)`, () => {
      expect(existsSync(join(RAIZ, 'infra', f))).toBe(false);
      expect(existsSync(join(RAIZ, 'docs/legado/infra', f))).toBe(true);
    });
  }
  it('docs/legado/infra tem README avisando que nao e usado pelo deploy', () => {
    expect(read('docs/legado/infra/README.md')).toMatch(/NAO .*produ/i);
  });
  it('compose da raiz e marcado como desenvolvimento', () => {
    expect(read('docker-compose.yml')).toMatch(/SOMENTE DESENVOLVIMENTO/);
    expect(read('docker-compose.yml')).not.toMatch(/:latest/);
  });
  it('scripts de deploy/backup/seguranca e workflows so referenciam docker-compose.prod.yml', () => {
    const files: string[] = [];
    for (const dir of ['scripts/deploy', 'scripts/backup', 'scripts/security', '.github/workflows']) {
      for (const n of readdirSync(join(RAIZ, dir))) { const f = `${dir}/${n}`; if (statSync(join(RAIZ, f)).isFile()) files.push(f); }
    }
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const refs = read(f).match(/docker-compose[\w.-]*\.ya?ml/g) ?? [];
      for (const r of refs) expect(r, f).toBe('docker-compose.prod.yml');
    }
  });
});

describe('INF-08: docker-compose.prod.yml, ordem de subida', () => {
  const svc = compose('docker-compose.prod.yml').services;
  it('clamav tem healthcheck com clamdcheck.sh e start_period de 180s', () => {
    const hc = svc.clamav.healthcheck;
    expect(hc.test).toEqual(['CMD', 'clamdcheck.sh']);
    expect(hc.start_period).toBe('180s');
    expect(hc.retries).toBeGreaterThanOrEqual(3);
  });
  it('web espera a API saudavel', () => {
    expect(svc.web.depends_on).toEqual({ api: { condition: 'service_healthy' } });
  });
  it('API NAO espera o ClamAV ficar saudavel (sem ele a API sobe e o upload falha fechado com 503)', () => {
    expect(JSON.stringify(svc.api.depends_on)).not.toContain('clamav');
  });
  it('API continua esperando db e redis saudaveis', () => {
    expect(svc.api.depends_on.db.condition).toBe('service_healthy');
    expect(svc.api.depends_on.redis.condition).toBe('service_healthy');
  });
});
