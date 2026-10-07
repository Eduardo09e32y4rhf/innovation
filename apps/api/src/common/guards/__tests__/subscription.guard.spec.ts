import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { SubscriptionActiveGuard } from '../subscription.guard';

const DAY = 86_400_000;

function setup(options: { billingStatus: string; overdueInvoice?: boolean; role?: string; url?: string; token?: boolean }) {
  const prisma = {
    company: { findUnique: vi.fn().mockResolvedValue({ billingStatus: options.billingStatus }) },
    platformInvoice: { findFirst: vi.fn().mockResolvedValue(options.overdueInvoice ? { id: 'inv' } : null) },
  };
  const jwt = { verifyAsync: vi.fn().mockResolvedValue({ purpose: 'access', sub: 'u1', companyId: 'c1', role: options.role ?? 'ADMIN' }) };
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
  const guard = new SubscriptionActiveGuard(prisma as never, reflector, jwt as never);
  const context = {
    getHandler: () => undefined, getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ url: options.url ?? '/employees', headers: options.token === false ? {} : { authorization: 'Bearer x' } }) }),
  };
  return { guard, prisma, context: context as never };
}

describe('SubscriptionActiveGuard', () => {
  it('lê o token (request.user ainda não existe nos guards globais) e libera empresa em dia', async () => {
    const { guard, context } = setup({ billingStatus: 'ACTIVE' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('bloqueia CANCELED na hora com 402', async () => {
    const { guard, context } = setup({ billingStatus: 'CANCELED' });
    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 402 });
  });

  it('PAST_DUE dentro da carência continua liberado; passou da carência bloqueia', async () => {
    await expect(setup({ billingStatus: 'PAST_DUE', overdueInvoice: false }).guard.canActivate(setup({ billingStatus: 'PAST_DUE' }).context)).resolves.toBe(true);
    const blocked = setup({ billingStatus: 'PAST_DUE', overdueInvoice: true });
    await expect(blocked.guard.canActivate(blocked.context)).rejects.toBeInstanceOf(HttpException);
    const query = blocked.prisma.platformInvoice.findFirst.mock.calls[0][0].where;
    expect(query.dueDate.lt.getTime()).toBeLessThan(Date.now() - 14 * DAY);
  });

  it('DEV e rotas de regularização nunca são bloqueados', async () => {
    const dev = setup({ billingStatus: 'CANCELED', role: 'DEV' });
    await expect(dev.guard.canActivate(dev.context)).resolves.toBe(true);
    const billing = setup({ billingStatus: 'CANCELED', url: '/finance/company/status' });
    await expect(billing.guard.canActivate(billing.context)).resolves.toBe(true);
    const auth = setup({ billingStatus: 'CANCELED', url: '/auth/me' });
    await expect(auth.guard.canActivate(auth.context)).resolves.toBe(true);
  });

  it('sem token deixa passar (JwtAuthGuard rejeita depois)', async () => {
    const { guard, context } = setup({ billingStatus: 'CANCELED', token: false });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
