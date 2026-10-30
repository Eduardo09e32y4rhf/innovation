import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// INF-07: contrato das imagens de producao. Nao ha daemon Docker nos testes: o contrato le o Dockerfile.
// A prova de build real fica no job "build" do CI (docker build + docker run) e na conferencia manual da VPS.
const RAIZ = join(__dirname, '../..');

function stages(file: string): { name: string; body: string }[] {
  const text = readFileSync(join(RAIZ, file), 'utf8').replace(/\\\r?\n/g, ' ');
  const parts = text.split(/^(?=FROM\s)/m).filter((p) => /^FROM\s/.test(p));
  return parts.map((p) => ({ name: (p.match(/^FROM\s+\S+(?:\s+AS\s+(\S+))?/i)?.[1] ?? '').toLowerCase(), body: p }));
}

for (const [app, port] of [['api', 3333], ['web', 3000]] as const) {
  const file = `apps/${app}/Dockerfile`;
  describe(`${file} (INF-07)`, () => {
    const all = stages(file);
    const last = all[all.length - 1];
    it('e multi-stage e a imagem final nao instala nem compila nada', () => {
      expect(all.length).toBeGreaterThanOrEqual(2);
      expect(last.body).not.toMatch(/\bnpm\s+(ci|install|run\s+build)/);
    });
    it('roda como usuario nao-root (node) na imagem final', () => {
      const users = [...last.body.matchAll(/^USER\s+(\S+)/gm)].map((m) => m[1]);
      expect(users.length).toBeGreaterThan(0);
      expect(users[users.length - 1]).toBe('node');
    });
    it('tem HEALTHCHECK com wget na porta correta', () => {
      expect(last.body).toMatch(/^HEALTHCHECK\s+.*--start-period=\d+s/m);
      expect(last.body).toMatch(new RegExp(`HEALTHCHECK[^\\n]*wget[^\\n]*127\\.0\\.0\\.1:${port}/`));
    });
    it(`expoe a porta ${port} e mantem o comando node direto`, () => {
      expect(last.body).toMatch(new RegExp(`^EXPOSE ${port}$`, 'm'));
      expect(last.body).toMatch(app === 'api' ? /^CMD \["node", "apps\/api\/dist\/main\.js"\]$/m : /^CMD \["node", "apps\/web\/server\.js"\]$/m);
    });
    it('usa NODE_ENV=production na imagem final', () => {
      expect(last.body).toMatch(/NODE_ENV=production/);
    });
  });
}

describe('apps/api/Dockerfile: dependencias e volumes gravaveis (INF-07)', () => {
  const all = stages('apps/api/Dockerfile');
  const builder = all[0].body;
  const last = all[all.length - 1].body;
  it('devDependencies saem da imagem final (npm prune --omit=dev depois do prisma generate e do build)', () => {
    expect(builder.indexOf('prisma:generate')).toBeGreaterThan(-1);
    expect(builder.indexOf('npm prune --omit=dev')).toBeGreaterThan(builder.indexOf('build:api'));
    expect(builder.indexOf('npm prune --omit=dev')).toBeGreaterThan(builder.indexOf('prisma:generate'));
  });
  it('/data (api_data) e /app/storage pertencem ao usuario node ANTES do USER node', () => {
    const chown = last.search(/chown\s+-R\s+node:node[^\n]*\/data/);
    expect(chown).toBeGreaterThan(-1);
    expect(last).toMatch(/mkdir -p[^\n]*\/data\/recruitment[^\n]*\/data\/support/);
    expect(last).toMatch(/chown\s+-R\s+node:node[^\n]*\/app\/storage/);
    expect(chown).toBeLessThan(last.search(/^USER node/m));
  });
});

describe('apps/web/Dockerfile: cache do Next gravavel (INF-07)', () => {
  const last = stages('apps/web/Dockerfile').pop()!.body;
  it('.next/cache pertence ao usuario node', () => {
    expect(last).toMatch(/mkdir -p[^\n]*apps\/web\/\.next\/cache/);
    expect(last).toMatch(/chown\s+-R\s+node:node[^\n]*apps\/web\/\.next/);
  });
});

describe('docker-compose.prod.yml e as imagens (INF-07)', () => {
  const compose = readFileSync(join(RAIZ, 'docker-compose.prod.yml'), 'utf8');
  it('nenhum servico forca user root', () => {
    expect(compose).not.toMatch(/^\s+user:\s*["']?(root|0)\b/m);
  });
  it('a API continua na porta 3333 so em 127.0.0.1', () => {
    expect(compose).toContain('ports: ["127.0.0.1:3333:3333"]');
  });
  it('vps-update.sh arruma a posse do volume api_data (volume antigo era root) antes de subir a API', () => {
    const sh = readFileSync(join(RAIZ, 'scripts/deploy/vps-update.sh'), 'utf8');
    const fix = sh.search(/chown -R node:node \/data/);
    expect(fix).toBeGreaterThan(-1);
    expect(fix).toBeLessThan(sh.indexOf('compose up -d --no-build --no-deps api\n'));
    expect(sh).toMatch(/--user root/);
  });
});
