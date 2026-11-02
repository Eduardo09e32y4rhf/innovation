import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

vi.mock('bcryptjs', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, default: actual.default ?? actual, compare: vi.fn(actual.compare), hash: vi.fn(actual.hash) };
});

vi.mock('../../common/crypto/temporary-password', () => ({
  encryptTemporaryPassword: (value: string) => `enc:${value}`,
  decryptTemporaryPassword: (value: string) => value.replace(/^enc:/, ''),
}));

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService, mfaEnforcedRoles } from './mfa.service';
import { SecurityStore } from './security-store';
import { SessionService, hashToken } from './session.service';
import { base32Encode, hashRecoveryCode, matchTotpStep, totp } from './totp';

const SECRET = base32Encode(Buffer.from('12345678901234567890'));
const NOW = 1_700_000_010_000;

/** Store sem Redis: cai para o modo em memória. */
const memoryStore = () => new SecurityStore({ getStatus: () => false, getClient: () => null } as any);

describe('TOTP: anti-replay (RFC 6238 §5.2)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => vi.useRealTimers());

  const makeMfa = (overrides: Record<string, unknown> = {}) => {
    const user = { mfaSecretEnc: `enc:${SECRET}`, mfaEnabledAt: new Date(), mfaRecoveryHashes: [] as string[], role: 'ADMIN', ...overrides };
    const prisma = { user: { findUnique: vi.fn(async () => user), updateMany: vi.fn(async () => ({ count: 1 })), update: vi.fn(async () => user) } };
    return { mfa: new MfaService(prisma as any, memoryStore()), prisma };
  };

  it('matchTotpStep devolve o passo certo e null para código errado', () => {
    const step = Math.floor(NOW / 1000 / 30);
    expect(matchTotpStep(SECRET, totp(SECRET, NOW), NOW)).toBe(step);
    expect(matchTotpStep(SECRET, '000000', NOW)).toBeNull();
    expect(matchTotpStep(SECRET, 'abcdef', NOW)).toBeNull();
  });

  it('o mesmo código não vale duas vezes', async () => {
    const { mfa } = makeMfa();
    const code = totp(SECRET, NOW);
    expect(await mfa.verifyLogin('u1', { code })).toBe(true);
    expect(await mfa.verifyLogin('u1', { code })).toBe(false);
  });

  it('o código do passo anterior (janela ±1) também é de uso único', async () => {
    const { mfa } = makeMfa();
    const previous = totp(SECRET, NOW - 30_000);
    expect(await mfa.verifyLogin('u1', { code: previous })).toBe(true);
    expect(await mfa.verifyLogin('u1', { code: previous })).toBe(false);
  });

  it('um código novo no passo seguinte volta a funcionar', async () => {
    const { mfa } = makeMfa();
    expect(await mfa.verifyLogin('u1', { code: totp(SECRET, NOW) })).toBe(true);
    vi.setSystemTime(NOW + 60_000);
    expect(await mfa.verifyLogin('u1', { code: totp(SECRET, NOW + 60_000) })).toBe(true);
  });

  it('o replay é por usuário: outro usuário com o mesmo segredo e código não é bloqueado', async () => {
    const { mfa } = makeMfa();
    const code = totp(SECRET, NOW);
    expect(await mfa.verifyLogin('u1', { code })).toBe(true);
    expect(await mfa.verifyLogin('u2', { code })).toBe(true);
  });

  it('código de recuperação é consumido uma vez só, mesmo com duas requisições concorrentes', async () => {
    const hash = hashRecoveryCode('ABCDE-FGHJK');
    const { mfa, prisma } = makeMfa({ mfaRecoveryHashes: [hash] });
    prisma.user.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const results = await Promise.all([
      mfa.verifyLogin('u1', { recoveryCode: 'ABCDE-FGHJK' }),
      mfa.verifyLogin('u1', { recoveryCode: 'ABCDE-FGHJK' }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(prisma.user.updateMany.mock.calls[0][0].where.mfaRecoveryHashes).toEqual({ equals: [hash] });
  });
});

describe('MFA: desativação exige segundo fator', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

  const build = (role: string) => {
    const user = { mfaSecretEnc: `enc:${SECRET}`, mfaEnabledAt: new Date(), mfaRecoveryHashes: [] as string[], role };
    const prisma = { user: { findUnique: vi.fn(async () => user), update: vi.fn(async () => user), updateMany: vi.fn() } };
    return { mfa: new MfaService(prisma as any, memoryStore()), prisma };
  };

  it('sem código: 403 e o MFA continua ativo', async () => {
    const { mfa, prisma } = build('RH');
    await expect(mfa.disable('u1', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('código errado: 403', async () => {
    const { mfa, prisma } = build('RH');
    await expect(mfa.disable('u1', { code: '000000' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('código válido desativa e limpa segredo e códigos de recuperação', async () => {
    const { mfa, prisma } = build('RH');
    await mfa.disable('u1', { code: totp(SECRET, NOW) });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { mfaSecretEnc: null, mfaEnabledAt: null, mfaRecoveryHashes: [] } });
  });

  it('perfil obrigado a ter MFA não consegue desativar nem com código válido', async () => {
    vi.stubEnv('MFA_ENFORCE', 'true');
    const { mfa, prisma } = build('DEV');
    await expect(mfa.disable('u1', { code: totp(SECRET, NOW) })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('enforcement: ligado por padrão em produção, desligável só explicitamente, desligado em dev', () => {
    expect(mfaEnforcedRoles({ NODE_ENV: 'production' } as any)).toEqual(['DEV', 'CEO', 'CONTABIL', 'COMERCIAL']);
    expect(mfaEnforcedRoles({ NODE_ENV: 'production', MFA_ENFORCE: 'false' } as any)).toEqual([]);
    expect(mfaEnforcedRoles({ NODE_ENV: 'development' } as any)).toEqual([]);
    expect(mfaEnforcedRoles({ NODE_ENV: 'production', MFA_ENFORCE_ROLES: 'dev, admin' } as any)).toEqual(['DEV', 'ADMIN']);
  });
});

describe('SessionService: teto absoluto e reuso do refresh token', () => {
  const token = 'x'.repeat(64);
  const baseSession = (over: Record<string, unknown> = {}) => ({
    id: 's1', userId: 'u1', family: 'f1', tokenHash: hashToken(token), revokedAt: null,
    expiresAt: new Date(Date.now() + 86_400_000), createdAt: new Date(), ...over,
  });

  const build = (current: any) => {
    const tx = {
      refreshSession: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        create: vi.fn(async ({ data }: any) => ({ id: 's2', ...data })),
        update: vi.fn(async () => ({})),
      },
    };
    const prisma: any = {
      refreshSession: { findUnique: vi.fn(async () => current), updateMany: vi.fn(async () => ({ count: 1 })) },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    };
    return { sessions: new SessionService(prisma), prisma, tx };
  };

  it('sessão mais velha que o teto absoluto é recusada e a família inteira é revogada', async () => {
    const old = baseSession({ createdAt: new Date(Date.now() - 91 * 86_400_000) });
    const { sessions, prisma } = build(old);
    expect(await sessions.rotate(token, {})).toEqual({ status: 'invalid' });
    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({ where: { family: 'f1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });

  it('dentro do teto, a rotação herda o createdAt (início da sessão) para o teto valer com uso contínuo', async () => {
    const started = new Date(Date.now() - 40 * 86_400_000);
    const { sessions, tx } = build(baseSession({ createdAt: started }));
    const result = await sessions.rotate(token, {});
    expect(result.status).toBe('ok');
    expect(tx.refreshSession.create.mock.calls[0][0].data.createdAt).toEqual(started);
  });

  it('o teto é configurável por SESSION_ABSOLUTE_DAYS', async () => {
    vi.stubEnv('SESSION_ABSOLUTE_DAYS', '7');
    const { sessions } = build(baseSession({ createdAt: new Date(Date.now() - 8 * 86_400_000) }));
    expect((await sessions.rotate(token, {})).status).toBe('invalid');
    vi.unstubAllEnvs();
  });

  it('reapresentar um refresh token já trocado derruba a família (reuse detection)', async () => {
    const { sessions, prisma } = build(baseSession({ revokedAt: new Date() }));
    expect(await sessions.rotate(token, {})).toEqual({ status: 'reuse', userId: 'u1' });
    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({ where: { family: 'f1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });
});

describe('AuthService: sem enumeração de contas', () => {
  const user = {
    id: 'u1', email: 'ana@x.com', name: 'Ana', isActive: true, role: 'RH', companyId: 'c1', passwordHash: bcrypt.hashSync('Correta@12345', 4),
    passwordChangedAt: new Date(), failedLoginAttempts: 0, lockedUntil: null, forcePasswordChange: false,
    company: { status: 'ACTIVE', billingStatus: 'ACTIVE' }, resetPasswordCode: 'ABC123', resetPasswordExpires: new Date(Date.now() + 3_600_000), employee: null,
  };

  const build = (found: any) => {
    const repository: any = {
      findUserByEmail: vi.fn(async () => found),
      findUserWithEmployeeByEmail: vi.fn(async () => found),
      createAuditLog: vi.fn(async () => ({})),
      incrementFailedLogins: vi.fn(async () => ({ failedLoginAttempts: 1 })),
      setLockedUntil: vi.fn(),
      setResetCode: vi.fn(async () => undefined),
      clearResetCode: vi.fn(async () => undefined),
    };
    const store = memoryStore();
    const service = new AuthService(repository, {} as any, { createSystemNotice: vi.fn() } as any, {} as any, {} as any, {} as any, {} as any, { isConfigured: () => false, send: vi.fn() } as any, store);
    return { service, repository };
  };

  it('login com e-mail inexistente gasta um bcrypt (mesmo custo) e responde igual a senha errada', async () => {
    const compare = vi.mocked(bcrypt.compare);
    compare.mockClear();
    const ghost = build(null);
    const known = build(user);
    const a = await ghost.service.login({ email: 'nao@existe.com', password: 'Qualquer@12345' } as any).catch((e) => e);
    const b = await known.service.login({ email: 'ana@x.com', password: 'Errada@12345' } as any).catch((e) => e);
    expect(a).toBeInstanceOf(UnauthorizedException);
    expect(b).toBeInstanceOf(UnauthorizedException);
    expect(a.getStatus()).toBe(b.getStatus());
    expect(a.getResponse()).toEqual(b.getResponse());
    expect(compare).toHaveBeenCalledTimes(2);
  });

  it('pedido de recuperação: mesmo corpo e não espera o trabalho real (existindo ou não)', async () => {
    const ghost = build(null);
    const known = build(user);
    const a = ghost.service.requestPasswordReset({ email: 'nao@existe.com' } as any, {});
    const b = known.service.requestPasswordReset({ email: 'ana@x.com' } as any, {});
    expect(a).toEqual({ requested: true });
    expect(b).toEqual(a);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(known.repository.setResetCode).toHaveBeenCalledTimes(1);
    expect(ghost.repository.setResetCode).not.toHaveBeenCalled();
  });

  it('validar código: conta inexistente, código errado e código expirado dão a mesma resposta', async () => {
    const ghost = build(null);
    const wrong = build({ ...user });
    const expired = build({ ...user, resetPasswordExpires: new Date(Date.now() - 1000) });
    const run = (ctx: ReturnType<typeof build>, code: string) =>
      ctx.service.validateResetCode({ email: 'ana@x.com', code } as any).catch((e) => e);
    const results = [await run(ghost, 'ABC123'), await run(wrong, 'ZZZZZZ'), await run(expired, 'ABC123')];
    for (const r of results) expect(r).toBeInstanceOf(UnauthorizedException);
    expect(new Set(results.map((r) => JSON.stringify(r.getResponse()))).size).toBe(1);
  });

  it('5 códigos errados invalidam o código de recuperação', async () => {
    const { service, repository } = build({ ...user });
    for (let i = 0; i < 4; i += 1) await service.validateResetCode({ email: 'ana@x.com', code: 'ZZZZZZZZ' } as any).catch(() => undefined);
    expect(repository.clearResetCode).not.toHaveBeenCalled();
    await service.validateResetCode({ email: 'ana@x.com', code: 'ZZZZZZZZ' } as any).catch(() => undefined);
    expect(repository.clearResetCode).toHaveBeenCalledWith('u1');
  });
});

describe('AuthController: IP do cliente não é forjável por cabeçalho', () => {
  it('usa request.ip e ignora X-Forwarded-For, X-Real-IP e CF-Connecting-IP', async () => {
    const service: any = { login: vi.fn(async () => ({ access_token: 't' })) };
    const controller = new AuthController(service, {} as any);
    const request = {
      ip: '203.0.113.7',
      headers: { 'x-forwarded-for': '9.9.9.9', 'x-real-ip': '8.8.8.8', 'cf-connecting-ip': '7.7.7.7', 'user-agent': 'jest' },
    };
    await controller.login({ email: 'a@b.com', password: 'x' } as any, request, { setCookie: vi.fn() });
    expect(service.login).toHaveBeenCalledWith(expect.anything(), { ipAddress: '203.0.113.7', userAgent: 'jest' });
  });
});

describe('SecurityStore (fallback em memória)', () => {
  it('claimOnce só aceita a primeira vez dentro do TTL', async () => {
    const store = memoryStore();
    expect(await store.claimOnce('k', 60)).toBe(true);
    expect(await store.claimOnce('k', 60)).toBe(false);
    expect(await store.claimOnce('outra', 60)).toBe(true);
  });

  it('hit conta e reset zera', async () => {
    const store = memoryStore();
    expect(await store.hit('c', 60)).toBe(1);
    expect(await store.hit('c', 60)).toBe(2);
    await store.reset('c');
    expect(await store.hit('c', 60)).toBe(1);
  });
});
