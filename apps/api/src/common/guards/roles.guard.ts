import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ANY_AUTHENTICATED_KEY } from '../decorators/any-authenticated.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserRole } from '../types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) {
      // SEG-09 camada 2: nega por padrao. Sem @Roles so passa com a marca explicita da rota.
      const targets = [context.getHandler(), context.getClass()];
      if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
      if (this.reflector.getAllAndOverride<boolean>(ANY_AUTHENTICATED_KEY, targets)) {
        if (!context.switchToHttp().getRequest().user) throw new UnauthorizedException();
        return true;
      }
      throw new ForbiddenException('Permissao insuficiente');
    }

    const user = context.switchToHttp().getRequest().user;

    if (user?.role === 'DEV') return true;
    if (roles.includes(user?.role)) return true;
    throw new ForbiddenException('Permissao insuficiente');
  }
}