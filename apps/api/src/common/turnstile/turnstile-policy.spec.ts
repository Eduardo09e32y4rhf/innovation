import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TurnstileService, turnstileFailMode } from './turnstile.service';

const ok = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
const ENV = ['TURNSTILE_SECRET_KEY', 'TURNSTILE_FAIL_MODE', 'TURNSTILE_ENFORCE', 'NODE_ENV'];

describe('SEG-10: politica de falha do Turnstile', () => {
  const saved: Record<string, string | undefined> = {};
  const service = new TurnstileService();
  beforeEach(() => { for (const k of ENV) { saved[k] = process.env[k]; delete process.env[k]; } process.env.TURNSTILE_SECRET_KEY = 'segredo'; });
  afterEach(() => { for (const k of ENV) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } vi.unstubAllGlobals(); });

  it('padrao e open (dev, e producao sem TURNSTILE_ENFORCE)', () => {
    expect(turnstileFailMode()).toBe('open');
    process.env.NODE_ENV = 'production';
    expect(turnstileFailMode()).toBe('open');
  });

  it('closed quando producao + chave + TURNSTILE_ENFORCE=true; TURNSTILE_FAIL_MODE explicito vence', () => {
    process.env.NODE_ENV = 'production'; process.env.TURNSTILE_ENFORCE = 'true';
    expect(turnstileFailMode()).toBe('closed');
    process.env.TURNSTILE_FAIL_MODE = 'open';
    expect(turnstileFailMode()).toBe('open');
    delete process.env.TURNSTILE_FAIL_MODE; delete process.env.TURNSTILE_SECRET_KEY;
    expect(turnstileFailMode()).toBe('open');
    process.env.NODE_ENV = 'development'; process.env.TURNSTILE_SECRET_KEY = 's'; process.env.TURNSTILE_FAIL_MODE = 'closed';
    expect(turnstileFailMode()).toBe('closed');
  });

  it('closed: HTTP 5xx, rede/timeout e segredo invalido dao 503 claro (nao passam)', async () => {
    process.env.TURNSTILE_FAIL_MODE = 'closed';
    vi.stubGlobal('fetch', ok({}, 503));
    await expect(service.verify('tok')).rejects.toBeInstanceOf(ServiceUnavailableException);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(service.verify('tok')).rejects.toMatchObject({ status: 503 });
    vi.stubGlobal('fetch', ok({ success: false, 'error-codes': ['invalid-input-secret'] }));
    const err = await service.verify('tok').catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(503);
    expect(String(err.message)).toMatch(/indispon|configura/i);
  });

  it('closed continua aceitando token valido e rejeitando token ruim com 400', async () => {
    process.env.TURNSTILE_FAIL_MODE = 'closed';
    vi.stubGlobal('fetch', ok({ success: true }));
    await expect(service.verify('tok')).resolves.toBeUndefined();
    vi.stubGlobal('fetch', ok({ success: false, 'error-codes': ['invalid-input-response'] }));
    await expect(service.verify('tok')).rejects.toMatchObject({ status: 400 });
  });

  it('open (padrao): continua passando em falha da Cloudflare, mas com alerta de erro no log', async () => {
    const warn = vi.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', ok({}, 503));
    await expect(service.verify('tok')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
