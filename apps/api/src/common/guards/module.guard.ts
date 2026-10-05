import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { REQUIRED_MODULE_KEY } from '../decorators/require-module.decorator';

/** Perfil nao e plano: alem do papel, o modulo precisa estar habilitado na empresa. Use depois de JwtAuthGuard. */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.getAllAndOverride<string | undefined>(REQUIRED_MODULE_KEY, [context.getHandler(), context.getClass()]);
    if (!moduleKey) return true;
    const user = context.switchToHttp().getRequest().user;
    if (user?.role === 'DEV') return true;
    const company = user?.companyId
      ? await this.prisma.company.findUnique({ where: { id: user.companyId }, select: { activeModules: true } })
      : null;
    if (!company || !company.activeModules?.includes(moduleKey)) {
      throw new ForbiddenException({ code: 'MODULE_NOT_ENABLED', message: 'Este modulo nao esta habilitado no plano da empresa.', module: moduleKey });
    }
    return true;
  }
}