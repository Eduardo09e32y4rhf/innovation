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

  findCompanyAuthContext(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, status: true, billingStatus: true, isActive: true },
    });
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
      orderBy: { displayOrder: 'asc' },
      select: { id: true, name: true, description: true, price: true, cycle: true, maxUsers: true, maxEmployees: true, activeModules: true, isFree: true, code: true, commitmentMonths: true, discountPercent: true, baseMonthlyPrice: true, userMonthlyPrice: true, asaasCycle: true, pricingVersion: true },
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

  findCouponByCode(code: string) {
    return this.prisma.promotionCoupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  }

  createSubscription(data: {
    companyId: string;
    planId: string;
    status: string;
    seatQuantity: number;
    pricingVersion?: string | null;
    baseMonthlyPrice?: unknown;
    userMonthlyPrice?: unknown;
    discountPercent?: unknown;
  }) {
    return this.prisma.companySubscription.upsert({
      where: { companyId: data.companyId },
      create: data as any,
      update: data as any,
    });
  }

  redeemTrialCoupon(data: {
    companyId: string;
    couponId: string;
    documentHash: string;
    trialDays: number;
    planId: string;
    seatQuantity: number;
    pricingVersion?: string | null;
    baseMonthlyPrice?: unknown;
    userMonthlyPrice?: unknown;
    discountPercent?: unknown;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const coupon = await tx.promotionCoupon.findUnique({ where: { id: data.couponId } });
      if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) {
        return { applied: false as const, reason: 'COUPON_INVALID' };
      }
      if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
        return { applied: false as const, reason: 'COUPON_LIMIT_REACHED' };
      }
      const alreadyRedeemed = await tx.couponRedemption.findUnique({ where: { documentHash: data.documentHash } });
      if (alreadyRedeemed) return { applied: false as const, reason: 'TRIAL_ALREADY_USED' };

      const trialEndsAt = new Date(now);
      trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + data.trialDays);

      await tx.couponRedemption.create({
        data: { couponId: coupon.id, companyId: data.companyId, documentHash: data.documentHash },
      });
      await tx.promotionCoupon.update({ where: { id: coupon.id }, data: { redemptionCount: { increment: 1 } } });
      await tx.company.update({
        where: { id: data.companyId },
        data: { status: 'ACTIVE', isActive: true, billingStatus: 'TRIAL', trialEndsAt, suspensionReason: null },
      });
      await tx.companySubscription.create({
        data: {
          companyId: data.companyId,
          planId: data.planId,
          status: 'TRIAL',
          seatQuantity: data.seatQuantity,
          trialStartedAt: now,
          trialEndsAt,
          pricingVersion: data.pricingVersion,
          baseMonthlyPrice: data.baseMonthlyPrice as any,
          userMonthlyPrice: data.userMonthlyPrice as any,
          discountPercent: data.discountPercent as any,
        },
      });
      return { applied: true as const, trialEndsAt };
    }, { isolationLevel: 'Serializable' });
  }

  deleteIncompleteCompany(id: string) {
    return this.prisma.company.delete({ where: { id } });
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
        suspensionReason: data.isFree ? null : 'aguardando_primeiro_pagamento',
        billingStatus: data.isFree ? 'ACTIVE' : 'PENDING_PAYMENT',
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
