import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

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
    return this.prisma.globalRolePermission.findMany();
  }

  async update(role: UserRole, permissions: string[]) {
    return this.prisma.globalRolePermission.upsert({
      where: { role },
      create: { role, permissions },
      update: { permissions },
    });
  }

  async getForRole(role: UserRole) {
    return this.prisma.globalRolePermission.findUnique({ where: { role } });
  }
}
