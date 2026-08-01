import { Injectable, OnModuleInit, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { UserRole } from '@prisma/client';
import type { JwtUser } from '../../common/types/auth.types';

const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  DEV: ['admin', 'config_company', 'config_payroll', 'config_time', 'time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  ADMIN: ['admin', 'config_company', 'config_payroll', 'config_time', 'time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  COMERCIAL: [],
  RH: ['time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  GESTOR: ['time_approve', 'time_view', 'time_clock', 'manage_employees', 'settings_basic'],
  FUNCIONARIO: ['time_view', 'time_clock', 'settings_basic'],
  CONSULTA: ['time_view'],
};

@Injectable()
export class GlobalPermissionsService implements OnModuleInit {
  private readonly logger = new Logger(GlobalPermissionsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    try {
      const existingCount = await this.prisma.globalRolePermission.count();
      if (existingCount === 0) {
        this.logger.log('Seeding permissões globais padrão...');
        for (const [role, permissions] of Object.entries(DEFAULT_PERMISSIONS)) {
          await this.prisma.globalRolePermission.create({
            data: { role: role as UserRole, permissions },
          });
        }
      }
    } catch (e) {
      this.logger.error('Erro ao semear permissões globais:', e);
    }
  }

  async list() {
    return this.prisma.globalRolePermission.findMany({ orderBy: { role: 'asc' } });
  }

  async update(role: UserRole, permissions: string[], actor: JwtUser) {
    if (!actor || actor.role !== 'DEV') {
      throw new ForbiddenException('Apenas DEV pode alterar permissões globais.');
    }

    const normalizedPermissions = Array.from(new Set((permissions ?? []).map((permission) => String(permission).trim()).filter(Boolean)));
    const current = await this.prisma.globalRolePermission.findUnique({ where: { role } });
    if (current && JSON.stringify(current.permissions ?? []) === JSON.stringify(normalizedPermissions)) {
      return { ...current, changed: false };
    }

    const updated = await this.prisma.globalRolePermission.upsert({
      where: { role },
      create: { role, permissions: normalizedPermissions },
      update: { permissions: normalizedPermissions },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: actor.companyId,
        userId: actor.sub,
        action: 'GLOBAL_PERMISSIONS_UPDATED',
        entity: 'GlobalRolePermission',
        entityId: String(role),
        metadata: {
          role,
          previous: current?.permissions ?? [],
          next: normalizedPermissions,
          changedFields: ['permissions'],
        },
      },
    });

    return { ...updated, changed: true };
  }

  async getForRole(role: UserRole) {
    return this.prisma.globalRolePermission.findUnique({ where: { role } });
  }
}
