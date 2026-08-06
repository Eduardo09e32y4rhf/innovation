import { ConflictException, Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
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

  async listCompanies(actor?: any, options?: { page?: number; limit?: number; search?: string }) {
    const where: any = {};
    if (actor && actor.role === 'COMERCIAL') {
      where.commercialOwnerId = actor.sub;
    }
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { document: { contains: options.search } },
      ];
    }
    
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
    const page = Math.max(options?.page ?? 1, 1);
    const skip = (page - 1) * limit;

    const [total, companies] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          subscription: true,
          platformPlan: { select: { id: true, name: true, code: true } },
          _count: { select: { users: true, employees: true } },
        },
      })
    ]);

    const data = companies.map((c: (typeof companies)[number]) => ({
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
      subscription: c.subscription,
      platformPlan: c.platformPlan,
      createdAt: c.createdAt,
      usersCount: c._count.users,
      employeesCount: c._count.employees,
    }));
    
    return { data, total, page, limit };
  }

  listCompanyAuditLogs(companyId: string, options?: { page?: number; limit?: number }) {
    const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);
    const page = Math.max(options?.page ?? 1, 1);
    const skip = (page - 1) * limit;
    return this.prisma.$transaction(async (tx) => {
      const [total, data] = await Promise.all([
        tx.auditLog.count({ where: { companyId } }),
        tx.auditLog.findMany({
          where: { companyId },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
      ]);
      return { data, total, page, limit };
    });
  }

  listBillingAuditLogs(options?: { companyId?: string; limit?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(options?.companyId ? { companyId: options.companyId } : {}),
        entity: { in: ['Company', 'Billing', 'Subscription'] },
      },
      include: {
        company: { select: { id: true, name: true, document: true, status: true, billingStatus: true, plan: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(options?.limit ?? 80, 1), 200),
    });
  }

  getCompany(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: { subscription: true, _count: { select: { users: true, employees: true } } },
    });
  }

  getPlan(id: string) {
    return this.prisma.platformPlan.findFirst({ where: { id, isActive: true } });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  countUsers(companyId: string) {
    return this.prisma.user.count({ where: { companyId, isActive: true, role: { in: ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] } } });
  }

  listCompanyUsers(companyId: string) {
    return this.prisma.user.findMany({ where: { companyId }, select: safeUserSelect, orderBy: { createdAt: 'desc' } });
  }

  findCompanyUser(companyId: string, userId: string) {
    return this.prisma.user.findFirst({ where: { id: userId, companyId }, select: safeUserSelect });
  }

  async createWithEmployeeSync(data: {
    companyId: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    customPermissions?: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...data,
          email: data.email.trim().toLowerCase(),
          passwordChangedAt: new Date(),
          forcePasswordChange: false,
        },
        select: safeUserSelect,
      });

      const employee = await tx.employee.findFirst({
        where: {
          companyId: data.companyId,
          email: { equals: data.email.trim().toLowerCase(), mode: 'insensitive' },
        },
        select: { id: true, userId: true },
      });

      if (employee) {
        if (employee.userId && employee.userId !== user.id) {
          throw new ConflictException('Este funcionario ja esta vinculado a outro usuario.');
        }
        await tx.employee.updateMany({
          where: { companyId: data.companyId, id: employee.id },
          data: {
            userId: user.id,
            name: data.name,
            email: data.email.trim().toLowerCase(),
          },
        });
      }

      const createdUser = await tx.user.findFirst({
        where: { id: user.id, companyId: data.companyId },
        select: safeUserSelect,
      });
      if (!createdUser) throw new ConflictException('Falha ao criar usuario sincronizado.');
      return createdUser;
    });
  }

  async updateWithEmployeeSync(companyId: string, userId: string, data: Record<string, unknown>) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findFirst({
        where: { id: userId, companyId },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });
      if (!current) return { count: 0, user: null };

      const result = await tx.user.updateMany({ where: { id: userId, companyId }, data });
      if (!result.count) return { count: 0, user: null };

      const nextEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : current.email;
      const nextName = typeof data.name === 'string' ? data.name.trim() : current.name;
      const linkedEmployee = await tx.employee.findFirst({
        where: { companyId, userId },
        select: { id: true, userId: true },
      });
      const emailMatchEmployee = linkedEmployee
        ? null
        : await tx.employee.findFirst({
            where: {
              companyId,
              email: { equals: nextEmail, mode: 'insensitive' },
            },
            select: { id: true, userId: true },
          });
      const employee = linkedEmployee ?? emailMatchEmployee;

      if (employee) {
        if (employee.userId && employee.userId !== userId) {
          throw new ConflictException('Este funcionario ja esta vinculado a outro usuario.');
        }
        await tx.employee.updateMany({
          where: { companyId, id: employee.id },
          data: {
            userId,
            ...(typeof data.name === 'string' ? { name: nextName } : {}),
            ...(typeof data.email === 'string' ? { email: nextEmail } : {}),
          },
        });
      }

      const updatedUser = await tx.user.findFirst({
        where: { id: userId, companyId },
        select: safeUserSelect,
      });
      if (!updatedUser) throw new ConflictException('Falha ao atualizar usuario sincronizado.');

      return {
        count: result.count,
        user: updatedUser,
      };
    });
  }

  async deactivateWithEmployeeSync(companyId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id: userId, companyId },
        data: {
          isActive: false,
          forcePasswordChange: true,
          resetPasswordCode: null,
          resetPasswordExpires: null,
        },
      });
      if (!result.count) return { count: 0, user: null };

      const updatedUser = await tx.user.findFirst({
        where: { id: userId, companyId },
        select: safeUserSelect,
      });
      if (!updatedUser) throw new ConflictException('Falha ao desativar usuario sincronizado.');

      return {
        count: result.count,
        user: updatedUser,
      };
    });
  }
  createCompanyUser(data: any) {
    // Garante que senha recÃÆ’ÂÂ©m-criada nÃÆ’ÂÂ£o dispare a regra de troca obrigatÃÆ’ÂÂ³ria de 30 dias
    return this.prisma.user.create({
      data: { ...data, passwordChangedAt: new Date(), forcePasswordChange: false },
      select: safeUserSelect,
    });
  }

  updateCompanyUser(companyId: string, userId: string, data: any) {
    return this.prisma.user.updateMany({ where: { id: userId, companyId }, data });
  }

  deleteCompanyUser(companyId: string, userId: string) {
    return this.prisma.user.updateMany({
      where: { id: userId, companyId },
      data: {
        isActive: false,
        forcePasswordChange: true,
        resetPasswordCode: null,
        resetPasswordExpires: null,
      },
    });
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
    billingStatus?: 'TRIAL' | 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
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
          status: params.billingStatus === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
          isActive: params.billingStatus === 'ACTIVE',
          suspensionReason: params.billingStatus === 'ACTIVE' ? null : 'aguardando_pagamento',
          plan: params.plan ?? 'FREE',
          billingStatus: params.billingStatus ?? 'TRIAL',
          trialEndsAt: params.trialEndsAt,
          platformPlanId: params.platformPlanId ?? null,
        },
      });
      if (params.platformPlanId) {
        await tx.companySubscription.create({
          data: {
            companyId: company.id,
            planId: params.platformPlanId,
            status: params.billingStatus ?? 'PENDING_PAYMENT',
            seatQuantity: params.maxUsers,
          },
        });
      }
      const admin = await tx.user.create({
        data: {
          companyId: company.id,
          name: params.adminName,
          email: params.adminEmail,
          passwordHash: params.adminPasswordHash,
          role: 'ADMIN',
          passwordChangedAt: new Date(),
          forcePasswordChange: false,
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
    return this.prisma.company.update({
      where: { id },
      data: { status: 'CANCELLED', isActive: false, billingStatus: 'CANCELED', suspensionReason: 'arquivada_pelo_dev' },
    });
  }

  async purgeCompany(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.companySubscription.deleteMany({ where: { companyId: id } });
      await tx.manualContract.deleteMany({ where: { companyId: id } });
      await tx.platformInvoice.deleteMany({ where: { companyId: id } });
      await tx.supportTicket.deleteMany({ where: { companyId: id } });
      await tx.auditLog.deleteMany({ where: { companyId: id } });
      await tx.user.deleteMany({ where: { companyId: id } });
      return tx.company.delete({ where: { id } });
    });
  }

  async globalStats(actor?: any) {
    const whereCompany: any = {};
    if (actor && actor.role === 'COMERCIAL') {
      whereCompany.commercialOwnerId = actor.sub;
    }
    const [companies, users, employees, messages, activeCompanies, suspendedCompanies, pastDueCompanies] = await Promise.all([
      this.prisma.company.count({ where: whereCompany }),
      this.prisma.user.count({ where: actor?.role === 'COMERCIAL' ? { company: whereCompany } : undefined }),
      this.prisma.employee.count({ where: actor?.role === 'COMERCIAL' ? { company: whereCompany } : undefined }),
      this.prisma.message.count(),
      this.prisma.company.count({ where: { ...whereCompany, status: 'ACTIVE' } }),
      this.prisma.company.count({ where: { ...whereCompany, status: 'SUSPENDED' } }),
      this.prisma.company.count({ where: { ...whereCompany, billingStatus: 'PAST_DUE' } }),
    ]);
    return { companies, users, employees, messages, activeCompanies, suspendedCompanies, pastDueCompanies };
  }

  getOnlineUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.prisma.user.findMany({
      where: { lastActiveAt: { gte: fiveMinutesAgo } },
      select: { id: true, name: true, email: true, role: true, lastActiveAt: true, company: { select: { name: true } } },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  async getFirstAdmin(companyId: string) {
    // Tenta admin ativo primeiro; fallback para qualquer admin (ghost-mode de emergÃÆ’ÂÂªncia)
    const activeAdmin = await this.prisma.user.findFirst({
      where: { companyId, role: 'ADMIN', isActive: true },
    });
    if (activeAdmin) return activeAdmin;
    return this.prisma.user.findFirst({
      where: { companyId, role: 'ADMIN' },
    });
  }

  createAuditLog(data: {
    companyId: string;
    action: string;
    actor?: string;
    entity?: string;
    entityId?: string;
    userId?: string | null;
    metadata?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId ?? null,
        action: data.action,
        entity: data.entity ?? 'Platform',
        entityId: data.entityId ?? null,
        metadata: {
          ...(data.metadata ?? {}),
          actorEmail: data.actor,
        },
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  }
}
