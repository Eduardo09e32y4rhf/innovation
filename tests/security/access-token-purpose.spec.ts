import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../apps/api/src/common/guards/jwt-auth.guard';

describe('JWT de finalidade restrita', () => {
  it.each(['mfa-login', 'password-reset', 'email-verify', undefined])('rejeita %s antes de carregar identidade ou permissões', async (purpose) => {
    const prisma = { user: { findUnique: vi.fn() } };
    const jwt = { verifyAsync: vi.fn().mockResolvedValue({ purpose, sub: 'privileged-user' }) };
    const guard = new JwtAuthGuard(jwt as never, prisma as never);
    const request = { headers: { authorization: 'Bearer signed-token' }, url: '/users' };
    const context = { switchToHttp: () => ({ getRequest: () => request }) };
    await expect(guard.canActivate(context as never)).rejects.toMatchObject({ status: 401 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(request).not.toHaveProperty('user');
  });
  it('bloqueia access token de uma família encerrada no logout', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'user', isActive: true, role: 'DEV', passwordChangedAt: null }) },
      refreshSession: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const jwt = { verifyAsync: vi.fn().mockResolvedValue({ purpose: 'access', sub: 'user', passwordVersion: 0, sessionFamily: 'family' }) };
    const guard = new JwtAuthGuard(jwt as never, prisma as never);
    const context = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer token' }, url: '/auth/me' }) }) };
    await expect(guard.canActivate(context as never)).rejects.toMatchObject({ status: 401 });
  });
  it('aceita token recém-emitido no mesmo segundo da troca e rejeita a versão anterior', async () => {
    const passwordChangedAt = new Date('2026-10-07T18:00:00.900Z');
    const claims = { purpose: 'access', sub: 'user', iat: 1791396000, passwordVersion: passwordChangedAt.getTime(), sessionFamily: 'family' };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'user', isActive: true, role: 'DEV', passwordChangedAt }) },
      refreshSession: { findFirst: vi.fn().mockResolvedValue({ id: 'session' }) },
    };
    const jwt = { verifyAsync: vi.fn().mockResolvedValue(claims) };
    const guard = new JwtAuthGuard(jwt as never, prisma as never);
    const request = { headers: { authorization: 'Bearer token' }, url: '/auth/me' };
    const context = { switchToHttp: () => ({ getRequest: () => request }) };
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    jwt.verifyAsync.mockResolvedValue({ ...claims, passwordVersion: passwordChangedAt.getTime() - 1 });
    await expect(guard.canActivate(context as never)).rejects.toMatchObject({ status: 401 });
  });
});
