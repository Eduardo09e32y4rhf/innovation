import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserRole } from '../types/auth.types';

const DEV_EMAILS = (process.env.DEV_ACCESS_EMAILS || 'eduardo998468@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isAuthorizedDev(user?: { role?: string; email?: string }) {
  return user?.role === 'DEV' && DEV_EMAILS.includes(String(user.email || '').toLowerCase());
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const user = context.switchToHttp().getRequest().user;

    // DEV de engenharia so tem acesso irrestrito quando o e-mail esta autorizado.
    if (isAuthorizedDev(user)) return true;

    if (roles.includes(user?.role)) return true;
    throw new ForbiddenException('Permissao insuficiente');
  }
}