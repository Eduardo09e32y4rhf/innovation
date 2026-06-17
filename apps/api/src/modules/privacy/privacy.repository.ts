import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrivacyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveConsent(userId: string, termVersion: string) {
    return this.prisma.privacyConsent.findFirst({
      where: { userId, termVersion, revokedAt: null },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  acceptConsent(data: {
    companyId: string;
    userId: string;
    termVersion: string;
    purpose: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.privacyConsent.upsert({
      where: { userId_termVersion: { userId: data.userId, termVersion: data.termVersion } },
      update: {
        purpose: data.purpose,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        acceptedAt: new Date(),
        revokedAt: null,
      },
      create: data,
    });
  }

  createAuditLog(data: {
    companyId: string;
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }
}
