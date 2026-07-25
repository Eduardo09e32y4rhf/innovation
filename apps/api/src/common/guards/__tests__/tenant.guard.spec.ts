import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantGuard } from '../tenant.guard';
import { vi } from 'vitest';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      company: {
        findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE', billingStatus: 'ACTIVE' }),
      },
    };
    guard = new TenantGuard(mockPrisma as any, {} as any);
  });

  it('should allow request without user (let JwtAuthGuard or public routes handle it)', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as ExecutionContext;
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should reject request with user but without companyId', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'x' } }),
      }),
    } as ExecutionContext;
    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow('No company context');
  });

  it('should allow request with valid companyId and store it in request', async () => {
    const req = { user: { sub: 'x', companyId: 'c1' } } as any;
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext;
    
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(req.companyId).toBe('c1');
  });
});
