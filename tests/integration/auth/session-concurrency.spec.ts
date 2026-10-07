import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../apps/api/src/database/prisma.service';
import { SessionService } from '../../../apps/api/src/modules/auth/session.service';
import { JwtAuthGuard } from '../../../apps/api/src/common/guards/jwt-auth.guard';

describe('Sessões com PostgreSQL real', () => {
  const prisma = new PrismaService();
  const sessions = new SessionService(prisma);
  const passwordChangedAt = new Date('2026-01-01T00:00:00.900Z');
  let companyId: string;
  let userId: string;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !target.pathname.includes('test')) throw new Error('Este teste exige banco local identificado como teste.');
    await prisma.$connect();
    const company = await prisma.company.create({ data: { name: `session-test-${randomUUID()}` } });
    companyId = company.id;
    const user = await prisma.user.create({ data: { companyId, name: 'Fixture de sessão', email: `session-${randomUUID()}@example.test`, passwordHash: 'test-only-not-a-login-password', role: 'DEV', passwordChangedAt } });
    userId = user.id;
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (companyId) await prisma.company.delete({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it('duas transações que leram a mesma sessão criam somente um sucessor', async () => {
    const initial = await sessions.create(userId, { userAgent: 'concurrency-test' });
    const originalRead = prisma.refreshSession.findUnique.bind(prisma.refreshSession);
    let reads = 0;
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const spy = vi.spyOn(prisma.refreshSession, 'findUnique').mockImplementation(async args => {
      const row = await originalRead(args);
      if (++reads === 2) release();
      await barrier;
      return row;
    });
    let results;
    try {
      results = await Promise.all([sessions.rotate(initial.token, {}), sessions.rotate(initial.token, {})]);
    } finally { spy.mockRestore(); }
    expect(results.filter(result => result.status === 'ok')).toHaveLength(1);
    expect(results.filter(result => result.status === 'invalid')).toHaveLength(1);
    const rows = await prisma.refreshSession.findMany({ where: { family: initial.session.family } });
    expect(rows).toHaveLength(2);
    const active = rows.filter(row => !row.revokedAt);
    expect(active).toHaveLength(1);
    expect(rows.find(row => row.id === initial.session.id)?.replacedBy).toBe(active[0].id);
  });

  it('logout invalida o access token sem aguardar sua expiração', async () => {
    const created = await sessions.create(userId, { userAgent: 'logout-test' });
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const token = jwt.sign({ purpose: 'access', sub: userId, passwordVersion: passwordChangedAt.getTime(), sessionFamily: created.session.family });
    const guard = new JwtAuthGuard(jwt, prisma);
    const context = { switchToHttp: () => ({ getRequest: () => ({ url: '/auth/me', headers: { authorization: `Bearer ${token}` } }) }) };
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    await sessions.revokeByToken(created.token);
    await expect(guard.canActivate(context as never)).rejects.toMatchObject({ status: 401 });
  });
});
