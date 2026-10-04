import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { userHasFaturasPermission, type FaturasPermission } from './faturas-permissions';

export const FATURAS_PERMISSION_KEY = 'faturasPermission';

/** Exige a permissão de faturas (padrão do perfil ou personalizada). Substitui @Roles nas rotas marcadas. */
export const RequireFaturasPermission = (permission: FaturasPermission) => SetMetadata(FATURAS_PERMISSION_KEY, permission);

@Injectable()
export class FaturasPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<FaturasPermission | undefined>(FATURAS_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;
    const user = context.switchToHttp().getRequest().user;
    if (userHasFaturasPermission(user, permission)) return true;
    throw new ForbiddenException('Permissao insuficiente');
  }
}
