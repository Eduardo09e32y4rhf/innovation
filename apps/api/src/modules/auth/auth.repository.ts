import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { emptyToNull, normalizeDisplayName } from '../../common/utils/text-normalization';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { company: true } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { company: true } });
  }

  findCompanyByDocument(document: string) {
    return this.prisma.company.findUnique({ where: { document } });
  }

  findPublicPlan(id?: string) {
    if (id) {
      return this.prisma.platformPlan.findFirst({ where: { id, isActive: true, isHidden: false } });
    }
    return this.prisma.platformPlan.findFirst({
      where: { isActive: true, isHidden: false },
      orderBy: [{ isFree: 'asc' }, { price: 'asc' }],
    });
  }

  listPublicPlans() {
    return this.prisma.platformPlan.findMany({
      where: { isActive: true, isHidden: false },
      orderBy: { price: 'asc' },
      select: { id: true, name: true, description: true, price: true, cycle: true, maxUsers: true, maxEmployees: true, activeModules: true, isFree: true },
    });
  }

  async findInadimplenteCompanyByDocument(document: string) {
    if (!document) return null;
    return this.prisma.company.findFirst({
      where: {
        document: document,
        billingStatus: { in: ['PAST_DUE', 'CANCELED'] },
        status: { in: ['SUSPENDED', 'CANCELLED'] }
      }
    });
  }

  createCompanyWithAdmin(data: {
    companyName: string;
    document: string;
    name: string;
    email: string;
    phone?: string;
    passwordHash: string;
    platformPlanId?: string;
    maxUsers: number;
    maxEmployees: number;
    activeModules: string[];
    isFree: boolean;
  }) {
    return this.prisma.company.create({
      data: {
        name: normalizeDisplayName(data.companyName),
        document: data.document,
        phone: emptyToNull(data.phone),
        status: data.isFree ? 'ACTIVE' : 'SUSPENDED',
        isActive: data.isFree,
        suspensionReason: data.isFree ? null : 'aguardando_pagamento',
        billingStatus: data.isFree ? 'ACTIVE' : 'PAST_DUE',
        plan: data.isFree ? 'FREE' : 'PRO',
        trialEndsAt: null,
        platformPlanId: data.platformPlanId,
        maxUsers: data.maxUsers,
        maxEmployees: data.maxEmployees,
        activeModules: data.activeModules,
        users: {
          create: {
            name: normalizeDisplayName(data.name),
            email: data.email.trim().toLowerCase(),
            passwordHash: data.passwordHash,
            role: 'ADMIN',
            passwordChangedAt: new Date(),
            forcePasswordChange: false,
          },
        },
      },
      include: { users: true, platformPlan: true },
    });
  }

  updatePassword(userId: string, passwordHash: string, previousPasswords: string[] = []) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, previousPasswords, passwordChangedAt: new Date(), forcePasswordChange: false },
    });
  }

  incrementFailedLogins(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  resetFailedLogins(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0 },
    });
  }

  setResetCode(userId: string, code: string, expires: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { resetPasswordCode: code, resetPasswordExpires: expires },
    });
  }

  clearResetCode(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { resetPasswordCode: null, resetPasswordExpires: null },
    });
  }

  findByResetCode(code: string) {
    return this.prisma.user.findFirst({
      where: { resetPasswordCode: code, resetPasswordExpires: { gt: new Date() } },
    });
  }

  findUserWithEmployeeByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { employee: true, company: true },
    });
  }
  searchEmployeesForPasswordReset(
    companyId: string,
    search: string,
  ) {
    const normalizedSearch = search.trim();

    return this.prisma.employee.findMany({
      where: {
        companyId,
        status: {
          not: 'TERMINATED',
        },
        userId: {
          not: null,
        },
        OR: [
          {
            name: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
          {
            registration: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 20,
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        registration: true,
        email: true,
        position: true,
        department: true,
        userId: true,
        user: {
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }

  findEmployeeUserForPasswordReset(
    companyId: string,
    employeeId: string,
  ) {
    return this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId,
        userId: {
          not: null,
        },
      },
      include: {
        user: true,
      },
    });
  }

  adminUpdatePassword(
    userId: string,
    passwordHash: string,
    previousPasswords: string[],
  ) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
        previousPasswords,
        passwordChangedAt: new Date(),
        forcePasswordChange: true,
        failedLoginAttempts: 0,
        resetPasswordCode: null,
        resetPasswordExpires: null,
      },
    });
  }

  createAuditLog(data: { companyId: string; userId?: string; action: string; entity: string; entityId?: string; metadata?: any; ipAddress?: string; userAgent?: string }) {
    return this.prisma.auditLog.create({ data });
  }
  userSafeSelect() {
    return { id: true, companyId: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true };
  }
}
