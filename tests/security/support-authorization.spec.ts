import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { SupportAuthorizationService } from '../../apps/api/src/modules/support/support-authorization.service';

describe('SupportAuthorizationService security contract', () => {
  const makeService = () => {
    const prisma = {
      employee: { findFirst: vi.fn(), findMany: vi.fn() },
      user: { findFirst: vi.fn() },
    } as any;
    return { service: new SupportAuthorizationService(prisma), prisma };
  };

  it('lets FUNCIONARIO open tickets only in their own name, never for another user', async () => {
    const { service } = makeService();
    const actor = { sub: 'u1', companyId: 'c1', role: 'FUNCIONARIO' };
    await expect(service.assertCanCreateTicket(actor)).resolves.toBe(true);
    await expect(service.assertCanCreateTicket(actor, 'u1')).resolves.toBe(true);
    await expect(service.assertCanCreateTicket(actor, 'u2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('still denies CONSULTA and COMERCIAL from creating tickets', async () => {
    const { service } = makeService();
    for (const role of ['CONSULTA', 'COMERCIAL']) {
      await expect(service.assertCanCreateTicket({ sub: 'u1', companyId: 'c1', role })).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('allows DEV to manage tickets', () => {
    const { service } = makeService();
    expect(() => service.assertCanManageTicket({ sub: 'dev', companyId: 'c1', role: 'DEV' }))
      .not.toThrow();
  });

  it('prevents COMERCIAL from creating internal notes', () => {
    const { service } = makeService();
    expect(() => service.assertCanCreateInternalNote({ sub: 'com', companyId: 'c1', role: 'COMERCIAL' }))
      .toThrow(ForbiddenException);
  });
});
