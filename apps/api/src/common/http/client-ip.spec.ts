import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip';

const SRC = join(__dirname, '..', '..');
const ALLOWED = new Set(['common/http/client-ip.ts', 'common/http/client-ip.spec.ts', 'modules/auth/session-mfa-security.spec.ts', 'main.ts']);
const SPOOFABLE = /['"](x-forwarded-for|x-real-ip|cf-connecting-ip)['"]/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

describe('IP do cliente (Fastify: request.ip e a unica fonte confiavel)', () => {
  it('nenhum arquivo da API le cabecalhos de IP enviados pelo cliente, exceto o helper unico', () => {
    const offenders = sourceFiles(SRC)
      .map((file) => relative(SRC, file).replace(/\\/g, '/'))
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => SPOOFABLE.test(readFileSync(join(SRC, file), 'utf8')));
    expect(offenders, `Use clientIp(request) de common/http/client-ip em: ${offenders.join(', ')}`).toEqual([]);
  });

  it('ignora cf-connecting-ip e x-real-ip forjados', async () => {
    const app = Fastify({ trustProxy: 'loopback,uniquelocal' });
    app.get('/ip', async (request) => ({ ip: clientIp(request) }));
    const response = await app.inject({ method: 'GET', url: '/ip', remoteAddress: '203.0.113.10', headers: { 'cf-connecting-ip': '9.9.9.9', 'x-real-ip': '8.8.8.8' } });
    expect(response.json().ip).toBe('203.0.113.10');
    await app.close();
  });

  it('x-forwarded-for de origem NAO confiavel nao vale: so vale quando vem do proxy da lista', async () => {
    const app = Fastify({ trustProxy: 'loopback,uniquelocal' });
    app.get('/ip', async (request) => ({ ip: clientIp(request) }));
    const direto = await app.inject({ method: 'GET', url: '/ip', remoteAddress: '203.0.113.10', headers: { 'x-forwarded-for': '9.9.9.9' } });
    expect(direto.json().ip).toBe('203.0.113.10');
    const peloProxy = await app.inject({ method: 'GET', url: '/ip', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': '198.51.100.7' } });
    expect(peloProxy.json().ip).toBe('198.51.100.7');
    await app.close();
  });

  it('sem IP devolve undefined e nunca texto de cabecalho', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '1.1.1.1' } } as any)).toBeUndefined();
  });
});
