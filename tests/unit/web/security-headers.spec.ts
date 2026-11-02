import { createRequire } from 'node:module';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const requireFromRoot = createRequire(join(__dirname, '../../../package.json'));
const configPath = join(__dirname, '../../../apps/web/next.config.js');

interface Rule { source: string; headers: Array<{ key: string; value: string }> }

/** Recarrega o next.config.js com um NODE_ENV/ambiente especifico (a CSP e o HSTS dependem do ambiente). */
async function loadHeaders(nodeEnv: string, env: Record<string, string> = {}): Promise<Rule[]> {
  const saved: Record<string, string | undefined> = {};
  for (const key of ['NODE_ENV', 'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_CDN_URL']) saved[key] = process.env[key];
  (process.env as Record<string, string>).NODE_ENV = nodeEnv;
  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.NEXT_PUBLIC_CDN_URL;
  Object.assign(process.env, env);
  try {
    delete requireFromRoot.cache[configPath];
    const cfg = requireFromRoot(configPath) as { headers: () => Promise<Rule[]> };
    return await cfg.headers();
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

const SECURITY_SOURCE = '/(.*)';
const value = (rules: Rule[], source: string, key: string) =>
  rules.filter((r) => r.source === source).flatMap((r) => r.headers).find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
const directive = (csp: string, name: string) => csp.split(';').map((d) => d.trim()).find((d) => d === name || d.startsWith(`${name} `));

describe('next.config.js headers(): cabecalhos de seguranca', () => {
  afterEach(() => { delete requireFromRoot.cache[configPath]; });

  it('aplica os cabecalhos basicos a todas as rotas', async () => {
    const rules = await loadHeaders('production');
    expect(value(rules, SECURITY_SOURCE, 'X-Content-Type-Options')).toBe('nosniff');
    expect(value(rules, SECURITY_SOURCE, 'X-Frame-Options')).toBe('DENY');
    expect(value(rules, SECURITY_SOURCE, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(value(rules, SECURITY_SOURCE, 'Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=(self), payment=()');
  });

  it('HSTS so em producao', async () => {
    const prod = await loadHeaders('production');
    expect(value(prod, SECURITY_SOURCE, 'Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    const dev = await loadHeaders('development');
    expect(value(dev, SECURITY_SOURCE, 'Strict-Transport-Security')).toBeUndefined();
  });

  it('CSP enforcing bloqueia enquadramento, base, form e object', async () => {
    const csp = value(await loadHeaders('production'), SECURITY_SOURCE, 'Content-Security-Policy')!;
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(csp, 'form-action')).toBe("form-action 'self'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
  });

  it('CSP Report-Only libera Turnstile e bloqueia frame de terceiros', async () => {
    const csp = value(await loadHeaders('production'), SECURITY_SOURCE, 'Content-Security-Policy-Report-Only')!;
    expect(csp).toBeTruthy();
    for (const d of ['script-src', 'frame-src', 'connect-src']) expect(directive(csp, d)).toContain('https://challenges.cloudflare.com');
    expect(directive(csp, 'frame-src')).not.toMatch(/\*|https:(?!\/)|evil/);
    expect(directive(csp, 'default-src')).toBe("default-src 'self'");
    expect(directive(csp, 'img-src')).toMatch(/data: blob:/);
    expect(directive(csp, 'font-src')).toContain('data:');
    expect(directive(csp, 'script-src')).toContain("'self'");
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-eval'");
  });

  it('acrescenta a origem absoluta da API/CDN em connect-src e img-src', async () => {
    const csp = value(await loadHeaders('production', { NEXT_PUBLIC_API_URL: 'https://api.exemplo.com.br/api', NEXT_PUBLIC_CDN_URL: 'https://cdn.exemplo.com.br' }), SECURITY_SOURCE, 'Content-Security-Policy-Report-Only')!;
    expect(directive(csp, 'connect-src')).toContain('https://api.exemplo.com.br');
    expect(directive(csp, 'img-src')).toContain('https://cdn.exemplo.com.br');
  });

  it('dev permite unsafe-eval (React), producao nao', async () => {
    const dev = value(await loadHeaders('development'), SECURITY_SOURCE, 'Content-Security-Policy-Report-Only')!;
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
  });
});

describe('next.config.js headers(): cache existente preservado', () => {
  it('paginas seguem no-store, public/ cache de 1 dia e /_next/static fica fora do no-store', async () => {
    const rules = await loadHeaders('production');
    const pages = rules.find((r) => r.source === '/((?!_next/|.*\\..*).*)')!;
    expect(pages.headers).toEqual([{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' }]);
    const assets = rules.find((r) => r.source.includes('png|jpg'))!;
    expect(assets.headers[0].value).toBe('public, max-age=86400, stale-while-revalidate=604800');
    // regra de seguranca nao define Cache-Control (nao pode sobrescrever o imutavel do Next em /_next/static)
    const security = rules.filter((r) => r.source === SECURITY_SOURCE).flatMap((r) => r.headers);
    expect(security.some((h) => h.key.toLowerCase() === 'cache-control')).toBe(false);
    expect(rules.some((r) => r.source.startsWith('/_next/static') && r.headers.some((h) => h.key.toLowerCase() === 'cache-control'))).toBe(false);
  });

  it('redirects continuam exportados', async () => {
    const cfg = requireFromRoot(configPath) as { redirects: () => Promise<unknown[]> };
    expect((await cfg.redirects()).length).toBeGreaterThan(20);
  });
});
