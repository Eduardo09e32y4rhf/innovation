import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DocumentService } from '../documents/document.service';
import type { JwtUser } from '../../common/types/auth.types';
import { UpdateCeoProfileDto } from './dto/update-ceo-profile.dto';
import { IssueCeoContractDto } from './dto/issue-ceo-contract.dto';

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
    const document = await this.documents.generateDocument(ceo.companyId, 'CONTRACT', `Contrato CEO ${dto.version}`, (pdf) => {
      pdf.fontSize(16).text(`Contrato do CEO - versao ${dto.version}`);
      pdf.moveDown().fontSize(10).text(dto.contentHtml.replace(/<[^>]*>/g, ' '));
      pdf.moveDown().text(`Hash da versao: ${hash}`);
    }, actor.sub);
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

  async createChallenge(actor: JwtUser) {
    const contract = await this.prisma.cEOContract.findFirst({ where: { ceoUserId: actor.sub, signedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!contract) throw new NotFoundException('Contrato pendente nao encontrado.');
    if (actor.role !== 'CEO') throw new ForbiddenException('Somente o CEO pode iniciar a assinatura.');
    const challenge = randomBytes(32).toString('base64url');
    await this.prisma.cEOContract.update({ where: { id: contract.id }, data: { challengeHash: createHash('sha256').update(challenge).digest('hex'), challengeExpiresAt: new Date(Date.now() + 10 * 60 * 1000), challengeUsedAt: null } });
    return { challenge, contractId: contract.id, contentHash: contract.contentHash, expiresInSeconds: 600 };
  }

  async sign(actor: JwtUser, contractId: string, challenge: string, contentHash: string) {
    if (actor.role !== 'CEO') throw new ForbiddenException('Somente o CEO pode assinar.');
    throw new BadRequestException('Assinatura bloqueada: a verificacao facial real do servidor ainda nao foi habilitada.');
  }
}
