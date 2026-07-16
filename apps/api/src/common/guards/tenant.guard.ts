import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;  // Populated by JwtAuthGuard
    
    // If there is no user, let the JwtAuthGuard or public routes handle it
    if (!user) {
      return true;
    }
    
    // DEV role might not be tied to a specific company, but typically they act on behalf of one via ghostMode.
    // If they strictly require access without companyId, we could check: if (user.role === 'DEV') return true;
    // However, to enforce strict multi-tenancy as requested, we enforce it universally.
    if (!user.companyId) {
      throw new UnauthorizedException('No company context');
    }
    
    // Store in request context for easier access
    request.companyId = user.companyId;
    return true;
  }
}
