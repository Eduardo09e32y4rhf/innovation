import { Injectable } from '@nestjs/common';
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

  updatePdfBase64(id: string, pdfBase64: string) {
    return this.prisma.privacyConsent.update({
      where: { id },
      data: { pdfBase64 },
    });
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
