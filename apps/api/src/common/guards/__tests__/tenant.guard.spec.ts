import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantGuard } from '../tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  it('should allow request without user (let JwtAuthGuard or public routes handle it)', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as ExecutionContext;
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should reject request with user but without companyId', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'x' } }),
      }),
    } as ExecutionContext;
    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(mockContext)).toThrow('No company context');
  });

  it('should allow request with valid companyId and store it in request', () => {
    const req = { user: { sub: 'x', companyId: 'c1' } } as any;
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext;
    
    expect(guard.canActivate(mockContext)).toBe(true);
    expect(req.companyId).toBe('c1');
  });
});
