import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'reflect-metadata';
import { AuthController } from '../../modules/auth/auth.controller';
import { CandidateAccountController } from '../../modules/jobs/candidate-account.controller';
import { PublicJobsController } from '../../modules/jobs/public-jobs.controller';
import { TurnstileGuard } from './turnstile.guard';
import { TurnstileService } from './turnstile.service';

const ok = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe('TurnstileService', () => {
  const service = new TurnstileService();
  beforeEach(() => { process.env.TURNSTILE_SECRET_KEY = 'segredo'; });
  afterEach(() => { delete process.env.TURNSTILE_SECRET_KEY; vi.unstubAllGlobals(); });

  it('desligado sem chave: nao chama a Cloudflare e aceita sem token', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(service.isEnabled()).toBe(false);
    await expect(service.verify(undefined)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('token valido: envia secret, response e remoteip por POST', async () => {
    const fetchMock = ok({ success: true }); vi.stubGlobal('fetch', fetchMock);
    await expect(service.verify('tok', '1.2.3.4')).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init.method).toBe('POST');
    expect(String(init.body)).toBe('secret=segredo&response=tok&remoteip=1.2.3.4');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('token invalido: 400 em portugues', async () => {
    vi.stubGlobal('fetch', ok({ success: false, 'error-codes': ['invalid-input-response'] }));
    await expect(service.verify('ruim')).rejects.toThrow(BadRequestException);
    await expect(service.verify('ruim')).rejects.toThrow(/anti-robô/);
  });

  it('token ausente com captcha ligado: 400 sem chamar a Cloudflare', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(service.verify('  ')).rejects.toThrow(/robô/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fail-open em erro de rede, HTTP 5xx e segredo mal configurado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(service.verify('tok')).resolves.toBeUndefined();
    vi.stubGlobal('fetch', ok({}, 503));
    await expect(service.verify('tok')).resolves.toBeUndefined();
    vi.stubGlobal('fetch', ok({ success: false, 'error-codes': ['invalid-input-secret'] }));
    await expect(service.verify('tok')).resolves.toBeUndefined();
  });
});

describe('TurnstileGuard (rota)', () => {
  const guard = new TurnstileGuard(new TurnstileService());
  const ctx = (req: any) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;
  afterEach(() => { delete process.env.TURNSTILE_SECRET_KEY; vi.unstubAllGlobals(); });

  it('rotas publicas expostas a robos usam o guard', () => {
    const guards = (fn: unknown) => Reflect.getMetadata('__guards__', fn as object) ?? [];
    expect(guards(AuthController.prototype.login)).toContain(TurnstileGuard);
    expect(guards(AuthController.prototype.registerCompany)).toContain(TurnstileGuard);
    expect(guards(AuthController.prototype.requestPasswordReset)).toContain(TurnstileGuard);
    expect(guards(CandidateAccountController.prototype.register)).toContain(TurnstileGuard);
    expect(guards(CandidateAccountController.prototype.login)).toContain(TurnstileGuard);
    expect(guards(CandidateAccountController.prototype.forgot)).toContain(TurnstileGuard);
    expect(guards(PublicJobsController.prototype.apply)).toContain(TurnstileGuard);
  });
  it('sem chave libera a rota', async () => { await expect(guard.canActivate(ctx({ headers: {}, body: {} }))).resolves.toBe(true); });
  it('com chave bloqueia sem token e aceita header ou corpo', async () => {
    process.env.TURNSTILE_SECRET_KEY = 's';
    const fetchMock = ok({ success: true }); vi.stubGlobal('fetch', fetchMock);
    await expect(guard.canActivate(ctx({ headers: {}, body: {} }))).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(ctx({ headers: { 'x-turnstile-token': 'h' }, body: {}, ip: '9.9.9.9' }))).resolves.toBe(true);
    await expect(guard.canActivate(ctx({ headers: {}, body: { turnstileToken: 'b' } }))).resolves.toBe(true);
    expect(String(fetchMock.mock.calls[0][1].body)).toContain('response=h');
    expect(String(fetchMock.mock.calls[1][1].body)).toContain('response=b');
  });
});
