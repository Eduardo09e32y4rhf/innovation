import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const safeUserSelect = {
  id: true,
  companyId: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  lastActiveAt: true,
  forcePasswordChange: true,
  failedLoginAttempts: true,
  passwordChangedAt: true,
  customPermissions: true,
  employee: {
    select: {
      id: true,
      name: true,
      registration: true,
      position: true,
      department: true,
      status: true,
    },
  },
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.user.findMany({
      select: {
        ...safeUserSelect,
        company: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string, companyId?: string) {
    return this.prisma.user.findFirst({ 
      where: { id, ...(companyId ? { companyId } : {}) }, 
      select: safeUserSelect 
    });
  }

  findByIdWithPassword(id: string, companyId?: string) {
    return this.prisma.user.findFirst({ 
      where: { id, ...(companyId ? { companyId } : {}) }, 
      select: { ...safeUserSelect, passwordHash: true } 
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  countByCompany(companyId: string) {
    return this.prisma.user.count({ where: { companyId } });
  }

  getCompanyLimits(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      select: { 
        plan: true, 
        status: true, 
        billingStatus: true,
        maxUsers: true,
        platformPlan: {
          select: { maxUsers: true },
        },
      },
    });
  }

  create(data: any) {
    return this.prisma.user.create({ data, select: safeUserSelect });
  }

  update(id: string, data: any, companyId?: string) {
    return this.prisma.user.updateMany({ 
      where: { id, ...(companyId ? { companyId } : {}) }, 
      data 
    });
  }

  delete(id: string, companyId?: string) {
    return this.prisma.user.deleteMany({ 
      where: { id, ...(companyId ? { companyId } : {}) } 
    });
  }

  ping(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
      select: { id: true, lastActiveAt: true },
    }).catch(() => null);
  }
}
