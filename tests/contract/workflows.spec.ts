import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

// INF-11 (actions por SHA, permissions por job, images.yml sem latest) e DEP-05 (audit + dependency review no CI).
const RAIZ = join(__dirname, '../..');
const DIR = join(RAIZ, '.github/workflows');
const files = readdirSync(DIR).filter((f) => f.endsWith('.yml'));
const text = (f: string) => readFileSync(join(DIR, f), 'utf8');
const wf = (f: string) => load(text(f)) as any;

describe('INF-11: toda action externa fixada por SHA de 40 hex com comentario de versao', () => {
  for (const f of files) {
    it(f, () => {
      for (const line of text(f).split('\n')) {
        const m = line.match(/^\s*-?\s*uses:\s*(\S+)(.*)$/);
        if (!m || m[1].startsWith('./')) continue;
        expect(m[1], line).toMatch(/^[\w.-]+\/[\w.\/-]+@[0-9a-f]{40}$/);
        expect(m[2], `comentario de versao em: ${line}`).toMatch(/#\s*v\d+\.\d+\.\d+\s*$/);
      }
    });
  }
});

describe('INF-11: permissions minimas por job', () => {
  for (const f of files) {
    it(f, () => {
      const w = wf(f);
      for (const [name, job] of Object.entries<any>(w.jobs)) {
        expect(job.permissions, `${f}:${name} sem permissions proprias`).toBeDefined();
      }
      // nada de escrita no nivel do workflow
      const top = JSON.stringify(w.permissions ?? {});
      expect(top).not.toMatch(/write/);
    });
  }
  it('so images.yml, release.yml e codeql.yml escrevem, e apenas o necessario', () => {
    const writes: Record<string, string[]> = {};
    for (const f of files) for (const [n, j] of Object.entries<any>(wf(f).jobs)) {
      const w = Object.entries(j.permissions ?? {}).filter(([, v]) => v === 'write').map(([k]) => k);
      if (w.length) writes[`${f}:${n}`] = w;
    }
    expect(writes).toEqual({
      'codeql.yml:analyze': ['security-events'],
      'images.yml:build': ['packages'],
      'labels-sync.yml:sync': ['issues'],
      'release.yml:release': ['contents'],
    });
  });
});

describe('INF-11: images.yml (builds claude/** compartilham o namespace do GHCR da producao)', () => {
  const t = text('images.yml');
  it('nunca publica a tag latest e so usa tag de SHA e de branch', () => {
    expect(t.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n')).not.toMatch(/[:,]latest\b/);
    expect(t).toMatch(/\$IMG:\$\{GITHUB_SHA\},\$IMG:\$BR/);
  });
  it('dispara na main (imagem do commit para `vps-update.sh main`) e em claude/**, e documenta o risco', () => {
    const on = wf('images.yml').on;
    expect(on.push.branches).toEqual(['main', 'claude/**']);
    expect(t).toMatch(/RISCO/);
  });
  it('a main publica a tag `main`; branch de trabalho tem prefixo proprio que nao colide com tags de producao (SHA da main, main, vX)', () => {
    expect(t).toMatch(/\[ "\$GITHUB_REF_NAME" = main \]; then BR="main"/);
    expect(t).toMatch(/BR="branch-/);
  });
});

describe('DEP-05: verificacao de vulnerabilidades no CI', () => {
  const ci = wf('ci.yml');
  it('job npm audit --omit=dev --audit-level=high, nao bloqueante e fora do ci-ok', () => {
    const job = ci.jobs['npm-audit'];
    expect(job['continue-on-error']).toBe(true);
    expect(JSON.stringify(job.steps)).toContain('npm audit --omit=dev --audit-level=high');
    expect(ci.jobs['ci-ok'].needs).not.toContain('npm-audit');
    expect(ci.jobs['ci-ok'].needs).not.toContain('dependency-review');
  });
  it('Dependency Review so em pull_request, fixado por SHA', () => {
    const job = ci.jobs['dependency-review'];
    expect(job.if).toContain("github.event_name == 'pull_request'");
    expect(JSON.stringify(job.steps)).toMatch(/actions\/dependency-review-action@[0-9a-f]{40}/);
    expect(job.permissions).toEqual({ contents: 'read' });
  });
});
