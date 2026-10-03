import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { JwtUser } from '../../../common/types/auth.types';
import { scopeOf, type ScheduleCapability } from './schedule-access';

export interface ActorEmployee {
  id: string;
  name: string;
  managerId: string | null;
  department: string | null;
}

@Injectable()
export class ScheduleScopeService {
  constructor(private readonly prisma: PrismaService) {}

  employeeOf(actor: JwtUser): Promise<ActorEmployee | null> {
    return this.prisma.employee.findFirst({
      where: { companyId: actor.companyId, userId: actor.sub },
      select: { id: true, name: true, managerId: true, department: true },
    });
  }

  /** `null` = empresa inteira; array = ids permitidos (próprio e/ou equipe). */
  async allowedEmployeeIds(actor: JwtUser, capability: ScheduleCapability): Promise<string[] | null> {
    const scope = scopeOf(actor.role, capability);
    if (!scope) throw new ForbiddenException('Seu perfil nao tem acesso a este recurso.');
    if (scope === 'company') return null;

    const self = await this.employeeOf(actor);
    if (scope === 'self') return self ? [self.id] : [];

    if (!self) return [];
    const team = await this.prisma.employee.findMany({
      where: { companyId: actor.companyId, managerId: self.id },
      select: { id: true },
    });
    return [self.id, ...team.map((employee) => employee.id)];
  }

  async assertEmployee(actor: JwtUser, capability: ScheduleCapability, employeeId: string) {
    const allowed = await this.allowedEmployeeIds(actor, capability);
    if (allowed !== null && !allowed.includes(employeeId)) {
      throw new ForbiddenException('Voce nao tem acesso aos dados deste funcionario.');
    }
    const exists = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId: actor.companyId }, select: { id: true } });
    if (!exists) throw new ForbiddenException('Funcionario nao encontrado.');
  }

  assertCapability(actor: JwtUser, capability: ScheduleCapability) {
    if (!scopeOf(actor.role, capability)) throw new ForbiddenException('Seu perfil nao tem acesso a este recurso.');
  }
}
