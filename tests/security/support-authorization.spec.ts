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

  it('denies FUNCIONARIO from creating tickets', async () => {
    const { service } = makeService();
    await expect(service.assertCanCreateTicket({ sub: 'u1', companyId: 'c1', role: 'FUNCIONARIO' }))
      .rejects.toBeInstanceOf(ForbiddenException);
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
