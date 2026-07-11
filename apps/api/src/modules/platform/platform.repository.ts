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
};

@Injectable()
export class PlatformRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanies() {
    const companies = await this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, employees: true } },
      },
    });
    return companies.map((c: (typeof companies)[number]) => ({
      id: c.id,
      name: c.name,
      document: c.document,
      logoUrl: c.logoUrl,
      commercialOwnerId: c.commercialOwnerId,
      maxUsers: c.maxUsers,
      maxEmployees: c.maxEmployees,
      isActive: c.isActive,
      status: c.status,
      suspensionReason: c.suspensionReason,
      subscriptionStartedAt: c.subscriptionStartedAt,
      plan: c.plan,
      billingStatus: c.billingStatus,
      trialEndsAt: c.trialEndsAt,
      activeModules: c.activeModules,
      asaasCustomerId: c.asaasCustomerId,
      asaasSubscriptionId: c.asaasSubscriptionId,
      internalNotes: c.internalNotes,
      createdAt: c.createdAt,
      usersCount: c._count.users,
      employeesCount: c._count.employees,
    }));
  }

  getCompany(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { users: true, employees: true } } },
    });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  countUsers(companyId: string) {
    return this.prisma.user.count({ where: { companyId } });
  }

  listCompanyUsers(companyId: string) {
    return this.prisma.user.findMany({ where: { companyId }, select: safeUserSelect, orderBy: { createdAt: 'desc' } });
  }

  findCompanyUser(companyId: string, userId: string) {
    return this.prisma.user.findFirst({ where: { id: userId, companyId }, select: safeUserSelect });
  }

  createCompanyUser(data: any) {
    return this.prisma.user.create({ data, select: safeUserSelect });
  }

  updateCompanyUser(companyId: string, userId: string, data: any) {
    return this.prisma.user.updateMany({ where: { id: userId, companyId }, data });
  }

  deleteCompanyUser(companyId: string, userId: string) {
    return this.prisma.user.deleteMany({ where: { id: userId, companyId } });
  }

  createCompanyWithAdmin(params: {
    name: string;
    document?: string | null;
    maxUsers: number;
    maxEmployees: number;
    adminName: string;
    adminEmail: string;
    adminPasswordHash: string;
    commercialOwnerId?: string | null;
    plan?: 'FREE' | 'BASE' | 'PRO' | 'ENTERPRISE';
    billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
    trialEndsAt?: Date;
    platformPlanId?: string;
  }) {
    return this.prisma.$transaction(async (tx: any) => {
      const company = await tx.company.create({
        data: {
          name: params.name,
          document: params.document ?? null,
          maxUsers: params.maxUsers,
          maxEmployees: params.maxEmployees,
          commercialOwnerId: params.commercialOwnerId ?? null,
          status: 'ACTIVE',
          isActive: true,
          plan: params.plan ?? 'FREE',
          billingStatus: params.billingStatus ?? 'TRIAL',
          trialEndsAt: params.trialEndsAt,
          platformPlanId: params.platformPlanId ?? null,
        },
      });
      const admin = await tx.user.create({
        data: {
          companyId: company.id,
          name: params.adminName,
          email: params.adminEmail,
          passwordHash: params.adminPasswordHash,
          role: 'ADMIN',
        },
        select: { id: true, email: true, role: true },
      });
      return { company, adminId: admin.id };
    });
  }

  updateCompany(id: string, data: any) {
    return this.prisma.company.update({ where: { id }, data });
  }

  deleteCompany(id: string) {
    return this.prisma.company.delete({ where: { id } });
  }

  async globalStats() {
    const [companies, users, employees, messages] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.user.count(),
      this.prisma.employee.count(),
      this.prisma.message.count(),
    ]);
    return { companies, users, employees, messages };
  }

  getOnlineUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.prisma.user.findMany({
      where: { lastActiveAt: { gte: fiveMinutesAgo } },
      select: { id: true, name: true, email: true, role: true, lastActiveAt: true, company: { select: { name: true } } },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  getFirstAdmin(companyId: string) {
    return this.prisma.user.findFirst({
      where: { companyId, role: 'ADMIN', isActive: true },
    });
  }

  createAuditLog(data: {
    companyId: string;
    action: string;
    actor: string;
    metadata?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        action: data.action,
        entity: 'Platform',
        metadata: {
          actorEmail: data.actor,
          ...data.metadata
        }
      }
    });
  }
}
