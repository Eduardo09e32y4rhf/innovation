import { SupportAuthorizationService } from './support-authorization.service';
import { ForbiddenException } from '@nestjs/common';

describe('SupportAuthorizationService (Multi-Tenant & Security Tests)', () => {
  let authService: SupportAuthorizationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    authService = new SupportAuthorizationService(mockPrisma);
  });

  it('should deny FUNCIONARIO from creating a support ticket', async () => {
    const actor = { sub: 'user-1', companyId: 'company-a', role: 'FUNCIONARIO' } as any;
    await expect(authService.assertCanCreateTicket(actor)).rejects.toThrow(ForbiddenException);
  });

  it('should allow ADMIN and RH to create a support ticket', async () => {
    const actor = { sub: 'user-2', companyId: 'company-a', role: 'ADMIN' } as any;
    await expect(authService.assertCanCreateTicket(actor)).resolves.not.toThrow();
  });

  it('should deny client from company A viewing ticket belonging to company B', async () => {
    const actor = { sub: 'user-3', companyId: 'company-a', role: 'ADMIN' } as any;
    const ticket = { id: 'tkt-1', companyId: 'company-b', createdByUserId: 'other-user' } as any;

    await expect(authService.assertCanViewTicket(actor, ticket)).rejects.toThrow(ForbiddenException);
  });

  it('should deny non-DEV from adding INTERNAL notes', () => {
    const actor = { sub: 'user-4', companyId: 'company-a', role: 'ADMIN' } as any;
    expect(() => authService.assertCanCreateInternalNote(actor)).toThrow(ForbiddenException);
  });

  it('should allow DEV to add INTERNAL notes', () => {
    const actor = { sub: 'dev-1', companyId: 'company-dev', role: 'DEV' } as any;
    expect(() => authService.assertCanCreateInternalNote(actor)).not.toThrow();
  });
});
