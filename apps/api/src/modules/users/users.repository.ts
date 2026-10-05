import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { encryptTemporaryPassword } from '../../common/crypto/temporary-password';

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
  onboardingState: true,
  onboardingCompletedAt: true,
  blockedAt: true,
  blockedReason: true,
  canceledAt: true,
  company: { select: { name: true } },
  employee: {
    select: {
      id: true,
      name: true,
      registration: true,
      position: true,
      department: true,
      status: true,
      userId: true,
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
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string, companyId?: string) {
    return this.prisma.user.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
      select: safeUserSelect,
    });
  }

  findByIdWithPassword(id: string, companyId?: string) {
    return this.prisma.user.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
      select: { ...safeUserSelect, passwordHash: true, previousPasswords: true },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  findEmployeeByUserId(companyId: string, userId: string) {
    return this.prisma.employee.findFirst({
      where: { companyId, userId },
      select: { id: true, name: true, email: true, userId: true },
    });
  }

  findEmployeeByEmail(companyId: string, email: string) {
    const normalized = email.trim().toLowerCase();
    return this.prisma.employee.findFirst({
      where: { companyId, email: { equals: normalized, mode: 'insensitive' } },
      select: { id: true, name: true, email: true, userId: true },
    });
  }

  countByCompany(companyId: string) {
    return this.prisma.user.count({
      where: {
        companyId,
        isActive: true,
        role: { in: ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
      },
    });
  }

  getCompanyLimits(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        plan: true,
        status: true,
        billingStatus: true,
        subscription: {
          select: { seatQuantity: true },
        },
      },
    });
  }

  async createWithEmployeeSync(data: {
    companyId: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    customPermissions?: string[];
    temporaryPassword?: { value: string; expiresAt: Date };
    employeeId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const { temporaryPassword, employeeId, ...userData } = data;
      const user = await tx.user.create({
        data: {
          ...userData,
          email: userData.email.trim().toLowerCase(),
          passwordChangedAt: new Date(),
          forcePasswordChange: true,
          ...(userData.role === 'CEO' ? { onboardingState: 'PASSWORD_CHANGE' as const } : {}),
        },
        select: safeUserSelect,
      });

      if (temporaryPassword) {
        await tx.temporaryCredential.create({
          data: {
            userId: user.id,
            encryptedValue: encryptTemporaryPassword(temporaryPassword.value),
            expiresAt: temporaryPassword.expiresAt,
          },
        });
      }

      let employee;
      if (employeeId) {
        employee = await tx.employee.findFirst({
          where: { companyId: data.companyId, id: employeeId },
          select: { id: true, userId: true },
        });
      } else {
        employee = await tx.employee.findFirst({
          where: {
            companyId: data.companyId,
            email: { equals: data.email.trim().toLowerCase(), mode: 'insensitive' },
          },
          select: { id: true, userId: true },
        });
      }

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

      return tx.user.findFirst({
        where: { id: user.id, companyId: data.companyId },
        select: safeUserSelect,
      });
    });
  }

  async updateWithEmployeeSync(
    companyId: string,
    userId: string,
    data: Record<string, unknown>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findFirst({
        where: { id: userId, companyId },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });
      if (!current) return { count: 0, user: null };

      const result = await tx.user.updateMany({
        where: { id: userId, companyId },
        data,
      });
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

      return {
        count: result.count,
        user: await tx.user.findFirst({
          where: { id: userId, companyId },
          select: safeUserSelect,
        }),
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

      return {
        count: result.count,
        user: await tx.user.findFirst({
          where: { id: userId, companyId },
          select: safeUserSelect,
        }),
      };
    });
  }

  findEmployeeForLink(companyId: string, employeeId: string) {
    return this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true, name: true, email: true, registration: true, userId: true },
    });
  }

  /** Funcionários da empresa ainda sem usuário (candidatos a vínculo). */
  findLinkableEmployees(companyId: string, search: string) {
    const term = search.trim();
    return this.prisma.employee.findMany({
      where: {
        companyId,
        userId: null,
        status: { not: 'TERMINATED' },
        ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }, { registration: { contains: term, mode: 'insensitive' } }] } : {}),
      },
      select: { id: true, name: true, email: true, registration: true, position: true, department: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  /** Vincula (ou desvincula, com employeeId = null) o usuário a um funcionário. */
  async setEmployeeLink(companyId: string, userId: string, employeeId: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.employee.findFirst({ where: { companyId, userId }, select: { id: true, name: true, registration: true } });
      if (current && current.id !== employeeId) await tx.employee.updateMany({ where: { companyId, id: current.id }, data: { userId: null } });
      if (employeeId) {
        const result = await tx.employee.updateMany({ where: { companyId, id: employeeId, OR: [{ userId: null }, { userId }] }, data: { userId } });
        if (!result.count) throw new ConflictException('Este funcionario ja esta vinculado a outro usuario.');
      }
      return { previous: current };
    });
  }

  /** Bloqueio (reversivel), cancelamento (definitivo) e reativacao. */
  async setAccessState(companyId: string, userId: string, state: 'BLOCK' | 'UNBLOCK' | 'CANCEL', reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const data =
        state === 'BLOCK' ? { isActive: false, blockedAt: now, blockedReason: reason ?? null, passwordChangedAt: now }
        : state === 'CANCEL' ? { isActive: false, canceledAt: now, blockedAt: null, blockedReason: reason ?? null, forcePasswordChange: true, passwordChangedAt: now, resetPasswordCode: null, resetPasswordExpires: null }
        : { isActive: true, blockedAt: null, blockedReason: null, canceledAt: null, failedLoginAttempts: 0 };
      const result = await tx.user.updateMany({ where: { id: userId, companyId }, data });
      if (!result.count) return { count: 0, user: null };
      if (state === 'CANCEL') {
        await tx.employee.updateMany({ where: { companyId, userId }, data: { userId: null } });
        await tx.temporaryCredential.deleteMany({ where: { userId } });
      }
      return { count: result.count, user: await tx.user.findFirst({ where: { id: userId, companyId }, select: safeUserSelect }) };
    });
  }

  /** Remove o usuário e o que é só dele (sessões, credenciais provisórias, aceites); o funcionário é preservado. */
  async deleteUserPermanently(companyId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.employee.updateMany({ where: { companyId, userId }, data: { userId: null } });
      await tx.refreshSession.deleteMany({ where: { userId } });
      await tx.temporaryCredential.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }

  async touchEmployeeLink(companyId: string, userId: string, employeeId: string | null) {
    return this.prisma.employee.updateMany({
      where: { companyId, id: employeeId ?? undefined },
      data: { userId },
    });
  }

  update(id: string, data: Record<string, unknown>, companyId?: string) {
    return this.prisma.user.updateMany({
      where: { id, ...(companyId ? { companyId } : {}) },
      data,
    });
  }

  delete(id: string, companyId?: string) {
    return this.prisma.user.updateMany({
      where: { id, ...(companyId ? { companyId } : {}) },
      data: {
        isActive: false,
        forcePasswordChange: true,
        resetPasswordCode: null,
        resetPasswordExpires: null,
      },
    });
  }

  ping(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
      select: { id: true, lastActiveAt: true },
    }).catch(() => null);
  }

  createAuditLog(data: { companyId: string; userId?: string; action: string; entity: string; entityId?: string; metadata?: Prisma.InputJsonValue; ipAddress?: string; userAgent?: string }) {
    return this.prisma.auditLog.create({ data });
  }

  findTemporaryCredential(userId: string) {
    return this.prisma.temporaryCredential.findUnique({ where: { userId } });
  }

  markTemporaryCredentialRevealed(userId: string) {
    return this.prisma.temporaryCredential.update({
      where: { userId },
      data: { revealCount: { increment: 1 } },
    });
  }

  /** Reemissao: hash novo e credencial provisoria na mesma transacao. */
  reissueTemporaryPassword(userId: string, userData: Record<string, unknown>, encryptedValue: string, expiresAt: Date, companyId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({ where: { id: userId, ...(companyId ? { companyId } : {}) }, data: userData });
      if (!result.count) return { count: 0 };
      await tx.temporaryCredential.upsert({
        where: { userId },
        create: { userId, encryptedValue, expiresAt },
        update: { encryptedValue, expiresAt, issuedAt: new Date(), consumedAt: null, revokedAt: null, revealCount: 0 },
      });
      return { count: result.count };
    });
  }

  replaceTemporaryCredential(userId: string, encryptedValue: string, expiresAt: Date) {
    return this.prisma.temporaryCredential.upsert({
      where: { userId },
      create: { userId, encryptedValue, expiresAt },
      update: { encryptedValue, expiresAt, issuedAt: new Date(), consumedAt: null, revokedAt: null, revealCount: 0 },
    });
  }
}
