import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { createHash } from 'crypto';
import { SupportStorageService } from '../support/support-storage.service';

@Injectable()
export class PrivacyRepository {
  constructor(private readonly prisma: PrismaService, private readonly storageService: SupportStorageService) {}

  findActiveConsent(userId: string, termVersion: string) {
    return this.prisma.privacyConsent.findFirst({
      where: { userId, termVersion, revokedAt: null },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  getUserData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
  }

  getEmployeeId(userId: string) {
    return this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  getEmployeeData(userId: string) {
    return this.prisma.employee.findUnique({
      where: { userId },
    });
  }

  saveFaceEnrollment(companyId: string, employeeId: string, descriptor: number[]) {
    return this.prisma.faceEnrollment.upsert({
      where: { employeeId },
      update: { descriptor, enrolledAt: new Date() },
      create: { companyId, employeeId, descriptor, enrolledAt: new Date() },
    });
  }

  acceptConsent(data: {
    companyId: string;
    userId: string;
    termVersion: string;
    purpose: string;
    ipAddress?: string;
    userAgent?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    photoBase64?: string;
    pdfBase64?: string;
  }) {
    return this.prisma.privacyConsent.upsert({
      where: { userId_termVersion: { userId: data.userId, termVersion: data.termVersion } },
      update: {
        purpose: data.purpose,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        photoBase64: data.photoBase64,
        pdfBase64: data.pdfBase64,
        acceptedAt: new Date(),
        revokedAt: null,
      },
      create: data,
    });
  }

  async updatePdfBase64(id: string, pdfBase64: string) {
    const consent = await this.prisma.privacyConsent.update({
      where: { id },
      data: { pdfBase64 },
    });

    const sha256 = createHash('sha256').update(Buffer.from(pdfBase64, 'base64')).digest('hex');
    const storageKey = `docs/${consent.companyId}/privacy-${consent.id}-${sha256.slice(0, 8)}.pdf`;
    await this.storageService.saveFile(storageKey, Buffer.from(pdfBase64, 'base64'));
    const metadata = { termVersion: consent.termVersion, purpose: consent.purpose, acceptedAt: consent.acceptedAt.toISOString() };
    const existing = await this.prisma.generatedDocument.findFirst({ where: { sha256 } });
    if (existing) {
      await this.prisma.generatedDocument.update({ where: { id: existing.id }, data: { title: `Termo de Uso e Privacidade v${consent.termVersion}`, metadata } });
    } else {
      await this.prisma.generatedDocument.create({
        data: {
          companyId: consent.companyId,
          type: 'OTHER',
          title: `Termo de Uso e Privacidade v${consent.termVersion}`,
          storageKey,
          sha256,
          sizeBytes: Buffer.from(pdfBase64, 'base64').length,
          metadata,
          createdBy: consent.userId,
        },
      });
    }

    return consent;
  }

  createAuditLog(data: {
    companyId: string;
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }
}
