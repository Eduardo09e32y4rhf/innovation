import { PdfReport } from '../../common/pdf/pdf-report';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DocumentService } from '../documents/document.service';
import type { JwtUser } from '../../common/types/auth.types';
import { UpdateCeoProfileDto } from './dto/update-ceo-profile.dto';
import { IssueCeoContractDto } from './dto/issue-ceo-contract.dto';
import { canConfirm, checkSignedUpload } from './signed-pdf.rules';

@Injectable()
export class CeoOnboardingService {
  constructor(private readonly prisma: PrismaService, private readonly documents: DocumentService) {}

  async state(actor: JwtUser) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.sub }, include: { ceoProfile: true, ceoContracts: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!user || user.role !== 'CEO') throw new ForbiddenException('Apenas o CEO pode consultar este onboarding.');
    return { state: user.onboardingState, profile: user.ceoProfile, contract: user.ceoContracts[0] ?? null };
  }

  async updateProfile(actor: JwtUser, dto: UpdateCeoProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.sub }, select: { id: true, role: true, onboardingState: true } });
    if (!user || user.role !== 'CEO' || actor.sub !== user.id) throw new ForbiddenException('Somente o proprio CEO pode preencher seus dados.');
    if (user.onboardingState !== 'PROFILE_REQUIRED') throw new ConflictException('O perfil nao esta liberado na etapa atual do onboarding.');
    const profile = await this.prisma.cEOProfile.upsert({
      where: { userId: actor.sub },
      create: { userId: actor.sub, legalName: dto.legalName.trim(), cpf: dto.cpf.replace(/\D/g, ''), birthDate: new Date(dto.birthDate), data: dto.data as Prisma.InputJsonValue | undefined, completedAt: new Date() },
      update: { legalName: dto.legalName.trim(), cpf: dto.cpf.replace(/\D/g, ''), birthDate: new Date(dto.birthDate), data: dto.data as Prisma.InputJsonValue | undefined, completedAt: new Date() },
    });
    await this.prisma.user.update({ where: { id: actor.sub }, data: { onboardingState: 'CONTRACT_PENDING' } });
    return { profile, onboardingState: 'CONTRACT_PENDING' };
  }

  async issueContract(actor: JwtUser, ceoUserId: string, dto: IssueCeoContractDto) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Somente o DEV pode emitir o contrato do CEO.');
    const ceo = await this.prisma.user.findUnique({ where: { id: ceoUserId }, select: { id: true, role: true, companyId: true, onboardingState: true } });
    if (!ceo || ceo.role !== 'CEO') throw new NotFoundException('CEO nao encontrado.');
    const hash = createHash('sha256').update(dto.contentHtml, 'utf8').digest('hex');
    const existing = await this.prisma.cEOContract.findUnique({ where: { ceoUserId_version: { ceoUserId, version: dto.version } } });
    if (existing) throw new ConflictException('A versao deste contrato ja foi emitida e e imutavel.');
    const contract = await this.prisma.cEOContract.create({ data: { ceoUserId, issuedById: actor.sub, version: dto.version, contentHtml: dto.contentHtml, contentHash: hash } });
    // Contrato entre a plataforma e a empresa: documento da Innovation, com a logo da Innovation.
    const report = await PdfReport.create({
      title: 'Contrato do CEO', number: `Versão ${dto.version}`, brand: { platform: true, name: 'Innovation RH' },
      footerNote: 'Para assinar, use o PDF desta versão no gov.br e envie o arquivo assinado.', footerId: `Hash ${hash.slice(0, 16)}`,
    });
    const text = dto.contentHtml
      .replace(/<\s*(br|\/p|\/div|\/h[1-6]|\/li|\/tr)\b[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .split(/\n+/).map((line) => line.replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
    text.forEach((line) => report.paragraph(line, { size: 10, gap: 8 }));
    report.fields([['Hash da versão (SHA-256)', hash]], 1);
    report.signatures([{ label: 'Assinatura do CEO' }, { label: 'Innovation RH' }]);
    const document = await this.documents.storePdf(ceo.companyId, 'CONTRACT', `Contrato CEO ${dto.version}`, await report.finish(), actor.sub);
    const updated = await this.prisma.cEOContract.update({ where: { id: contract.id }, data: { pdfDocumentId: document.id } });
    await this.prisma.notification.create({
      data: {
        companyId: ceo.companyId,
        type: 'DOCUMENT_NOTICE',
        targetType: 'USER',
        targetId: ceoUserId,
        title: 'Contrato do CEO disponivel',
        message: `A versao ${dto.version} do contrato foi emitida pelo DEV e esta disponivel para leitura antes da assinatura.`,
        source: 'PLATFORM',
        createdBy: actor.sub,
        status: 'SENT',
        sentAt: new Date(),
        targetUrl: `/ceo-onboarding/contract/${contract.id}`,
        recipients: { create: { userId: ceoUserId, status: 'UNREAD' } },
      },
    });
    await this.prisma.user.update({ where: { id: ceoUserId }, data: { onboardingState: 'CONTRACT_PENDING' } });
    return { ...updated, documentId: document.id };
  }

  // ─── Assinatura pelo gov.br (gratuita; a biometria facial e feita pelo proprio gov.br na conta prata/ouro) ───

  private async loadContract(actor: JwtUser, contractId: string) {
    const contract = await this.prisma.cEOContract.findUnique({ where: { id: contractId }, include: { ceo: { select: { id: true, companyId: true, onboardingState: true } } } });
    const allowed = contract && (actor.role === 'DEV' || (actor.role === 'CEO' && contract.ceoUserId === actor.sub));
    if (!contract || !allowed) throw new NotFoundException('Contrato nao encontrado.');
    return contract;
  }

  /** PDF da minuta (para assinar) ou a versao assinada mais recente. So o CEO titular e o DEV leem. */
  async contractFile(actor: JwtUser, contractId: string, which: 'original' | 'signed') {
    const contract = await this.loadContract(actor, contractId);
    const documentId = which === 'signed' ? contract.signedPdfDocumentId : contract.pdfDocumentId;
    if (!documentId) throw new NotFoundException('Arquivo nao disponivel.');
    return { buffer: await this.documents.readBuffer(documentId), name: `contrato-ceo-${contract.version}${which === 'signed' ? '-assinado' : ''}.pdf` };
  }

  /** Cada parte (CEO e DEV) envia o PDF com a sua assinatura nova; cada envio precisa acrescentar uma assinatura. */
  async uploadSigned(actor: JwtUser, contractId: string, file: Buffer) {
    const contract = await this.loadContract(actor, contractId);
    if (contract.verifiedAt || contract.signedAt) throw new ConflictException('Este contrato ja foi concluido.');
    if (actor.role === 'CEO' && contract.ceo.onboardingState !== 'CONTRACT_PENDING') throw new ConflictException('O contrato ainda nao esta liberado para assinatura nesta etapa.');
    if (!contract.pdfDocumentId) throw new ConflictException('A minuta em PDF nao foi gerada.');

    const previous = await this.documents.readBuffer(contract.signedPdfDocumentId ?? contract.pdfDocumentId);
    const check = checkSignedUpload(previous, contract.signatureCount, file);
    if (!check.ok) throw new BadRequestException(check.reason);

    const integrity = contract.signedPdfIntegrity === 'NOT_VERIFIABLE' || check.integrity === 'NOT_VERIFIABLE' ? 'NOT_VERIFIABLE' : 'PREFIX_MATCH';
    const stored = await this.documents.storeExternalPdf(contract.ceo.companyId, `Contrato CEO ${contract.version} assinado (${check.signatureCount} assinatura(s))`, file, actor.sub);
    // Concorrencia: so avanca se ninguem enviou outra versao nesse meio tempo.
    const result = await this.prisma.cEOContract.updateMany({
      where: { id: contractId, signatureCount: contract.signatureCount, verifiedAt: null },
      data: { signedPdfDocumentId: stored.id, signedPdfIntegrity: integrity, signatureCount: check.signatureCount, signatureHash: stored.sha256, signedUploadedById: actor.sub, signedUploadedAt: new Date() },
    });
    if (!result.count) throw new ConflictException('Outra versao foi enviada ao mesmo tempo. Baixe a versao mais recente e assine novamente.');
    await this.prisma.auditLog.create({ data: { companyId: contract.ceo.companyId, userId: actor.sub, action: 'CEO_CONTRACT_SIGNED_PDF_UPLOADED', entity: 'CEOContract', entityId: contractId, metadata: { signatureCount: check.signatureCount, integrity, sha256: stored.sha256 } } });
    return { signatureCount: check.signatureCount, integrity, awaitingOtherParty: check.signatureCount < 2 };
  }

  async pendingVerification(actor: JwtUser) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Somente o DEV confirma assinaturas.');
    return this.prisma.cEOContract.findMany({
      where: { signedPdfDocumentId: { not: null }, verifiedAt: null },
      orderBy: { signedUploadedAt: 'desc' },
      select: { id: true, ceoUserId: true, version: true, signatureCount: true, signedPdfIntegrity: true, signedUploadedAt: true },
    });
  }

  /**
   * O DEV confirma depois de validar o PDF em https://validar.iti.gov.br e conferir que e a minuta emitida.
   * So entao o contrato conta como assinado e o CEO e liberado.
   */
  async confirm(actor: JwtUser, contractId: string, dto: { checkedItiValidator: boolean; documentMatches: boolean; note?: string }) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Somente o DEV confirma assinaturas.');
    if (dto.checkedItiValidator !== true || dto.documentMatches !== true) {
      throw new BadRequestException('Confirme que validou as assinaturas no validador do ITI e que o PDF e a minuta emitida.');
    }
    const contract = await this.loadContract(actor, contractId);
    const verdict = canConfirm(contract);
    if (!verdict.ok) throw new ConflictException(verdict.reason);
    const now = new Date();
    const note = dto.note?.trim().slice(0, 500) || null;
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.cEOContract.updateMany({ where: { id: contractId, verifiedAt: null }, data: { verifiedById: actor.sub, verifiedAt: now, signedAt: now, verificationNote: note } });
      if (!result.count) throw new ConflictException('Contrato ja confirmado.');
      await tx.user.update({ where: { id: contract.ceoUserId }, data: { onboardingState: 'ACTIVE' } });
      await tx.auditLog.create({ data: { companyId: contract.ceo.companyId, userId: actor.sub, action: 'CEO_CONTRACT_CONFIRMED', entity: 'CEOContract', entityId: contractId, metadata: { integrity: contract.signedPdfIntegrity, signatureCount: contract.signatureCount, note } } });
    });
    return { confirmed: true, onboardingState: 'ACTIVE' };
  }}
