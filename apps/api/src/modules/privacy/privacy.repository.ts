import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { createHash } from 'crypto';
import { SupportStorageService } from '../support/support-storage.service';
import { decryptForCompany, sealFile } from '../../common/crypto/file-crypto';

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

  /** RS-D-14: o PDF do aceite fica no armazenamento privado, cifrado por empresa, e nao mais como base64 na linha do banco. */
  private async storeConsentPdf(consent: { id: string; companyId: string }, pdf: Buffer): Promise<string> {
    const sealed = sealFile(pdf, consent.companyId);
    const pdfKey = `privacy/${consent.companyId}/${consent.id}-${createHash('sha256').update(pdf).digest('hex').slice(0, 12)}.pdf`;
    await this.storageService.saveFile(pdfKey, sealed.data);
    return pdfKey;
  }

  /** Le o PDF do aceite (novo: arquivo cifrado; antigo: base64 na linha, que e movido para o arquivo na primeira leitura). */
  async readConsentPdf(consent: { id: string; companyId: string; pdfKey?: string | null; pdfBase64?: string | null }): Promise<string | null> {
    if (consent.pdfKey) {
      const stream = await this.storageService.getFileStream(consent.pdfKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      return decryptForCompany(Buffer.concat(chunks), consent.companyId).toString('base64');
    }
    if (consent.pdfBase64) {
      const pdfKey = await this.storeConsentPdf(consent, Buffer.from(consent.pdfBase64, 'base64'));
      await this.prisma.privacyConsent.update({ where: { id: consent.id }, data: { pdfKey, pdfBase64: null } });
      return consent.pdfBase64;
    }
    return null;
  }

  async updatePdfBase64(id: string, pdfBase64: string) {
    const current = await this.prisma.privacyConsent.findUniqueOrThrow({ where: { id }, select: { id: true, companyId: true } });
    const pdfKey = await this.storeConsentPdf(current, Buffer.from(pdfBase64, 'base64'));
    const consent = await this.prisma.privacyConsent.update({
      where: { id },
      data: { pdfKey, pdfBase64: null },
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
