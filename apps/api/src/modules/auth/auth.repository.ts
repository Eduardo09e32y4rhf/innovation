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
    document?: string;
    name: string;
    email: string;
    passwordHash: string;
  }) {
    return this.prisma.company.create({
      data: {
        name: normalizeDisplayName(data.companyName),
        document: emptyToNull(data.document),
        billingStatus: 'TRIAL',
        plan: 'BASE',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days trial
        phone: (data as any).phone ? emptyToNull((data as any).phone) : null,
        users: {
          create: {
            name: normalizeDisplayName(data.name),
            email: data.email.trim().toLowerCase(),
            passwordHash: data.passwordHash,
            role: 'ADMIN',
          },
        },
      },
      include: { users: true },
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

  createAuditLog(data: { companyId: string; userId?: string; action: string; entity: string; entityId?: string; metadata?: any; ipAddress?: string; userAgent?: string }) {
    return this.prisma.auditLog.create({ data });
  }
  userSafeSelect() {
    return { id: true, companyId: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true };
  }
}
