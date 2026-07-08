import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class GlobalPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

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
