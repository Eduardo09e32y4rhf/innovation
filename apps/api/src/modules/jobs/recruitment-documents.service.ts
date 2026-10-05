import { BadRequestException, ConflictException, Injectable, NotFoundException, PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { CandidateDocumentScanner } from './candidate-document-scanner.service';
import { JobScopeService } from './job-scope.service';
import { JobsStorageService } from './jobs-storage.service';
import {
  DEFAULT_LINK_DAYS,
  MAX_DOCUMENT_BYTES,
  MAX_LINK_DAYS,
  detectDocumentType,
  evaluateForwardReadiness,
  generateAccessToken,
  hashAccessToken,
  linkState,
  normalizeItems,
  safeDownloadName,
} from './recruitment-documents.rules';

type Actor = { sub: string; role?: string };

const INVALID_LINK = 'Link invalido ou expirado.';
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43,64}$/;

@Injectable()
export class RecruitmentDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: JobsStorageService,
    private readonly scanner: CandidateDocumentScanner,
    private readonly scope: JobScopeService,
  ) {}

  // ─── Area interna (empresa + escopo da vaga) ────────────────────────────

  async createRequest(companyId: string, actor: Actor, applicationId: string, dto: { items: string[]; expiresInDays?: number }) {
    await this.scope.assertApplication(companyId, actor, applicationId);
    const items = normalizeItems(dto.items);
    if (!items.length) throw new BadRequestException('Informe ao menos um documento a solicitar.');
    const application = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { forwardedAt: true } });
    if (application?.forwardedAt) throw new ConflictException('A candidatura ja foi encaminhada ao RH da empresa.');

    const days = Math.min(Math.max(Math.trunc(dto.expiresInDays ?? DEFAULT_LINK_DAYS), 1), MAX_LINK_DAYS);
    const { token, hash } = generateAccessToken();
    const expiresAt = new Date(Date.now() + days * 86_400_000);
    const request = await this.prisma.recruitmentDocumentRequest.create({
      data: { companyId, applicationId, tokenHash: hash, items, expiresAt, createdById: actor.sub },
      select: { id: true, items: true, expiresAt: true },
    });
    await this.audit(companyId, actor.sub, 'RECRUITMENT_DOCUMENT_LINK_CREATED', applicationId, { requestId: request.id, items, expiresAt });
    // O token bruto sai somente aqui; depois disso so o hash existe.
    return { ...request, token, path: `/carreiras/documentos/${token}` };
  }

  async listForApplication(companyId: string, actor: Actor, applicationId: string) {
    await this.scope.assertApplication(companyId, actor, applicationId);
    const [requests, documents, application] = await Promise.all([
      this.prisma.recruitmentDocumentRequest.findMany({ where: { companyId, applicationId }, orderBy: { createdAt: 'desc' }, select: { id: true, items: true, expiresAt: true, revokedAt: true, createdAt: true } }),
      this.prisma.recruitmentDocument.findMany({ where: { companyId, applicationId }, orderBy: { createdAt: 'desc' }, select: { id: true, requestId: true, label: true, status: true, fileName: true, mimeType: true, size: true, returnReason: true, reviewedAt: true, supersededAt: true, createdAt: true } }),
      this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { selectedAt: true, forwardedAt: true } }),
    ]);
    const now = new Date();
    return {
      selectedAt: application?.selectedAt ?? null,
      forwardedAt: application?.forwardedAt ?? null,
      requests: requests.map((request) => ({ ...request, state: linkState(request, now) })),
      documents,
    };
  }

  async revokeRequest(companyId: string, actor: Actor, requestId: string) {
    const request = await this.prisma.recruitmentDocumentRequest.findFirst({ where: { id: requestId, companyId }, select: { id: true, applicationId: true } });
    if (!request) throw new NotFoundException('Link nao encontrado.');
    await this.scope.assertApplication(companyId, actor, request.applicationId);
    await this.prisma.recruitmentDocumentRequest.updateMany({ where: { id: requestId, companyId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit(companyId, actor.sub, 'RECRUITMENT_DOCUMENT_LINK_REVOKED', request.applicationId, { requestId });
    return { revoked: true };
  }

  async download(companyId: string, actor: Actor, documentId: string) {
    const doc = await this.prisma.recruitmentDocument.findFirst({ where: { id: documentId, companyId }, select: { id: true, applicationId: true, fileKey: true, fileName: true, mimeType: true } });
    if (!doc) throw new NotFoundException('Documento nao encontrado.');
    await this.scope.assertApplication(companyId, actor, doc.applicationId);
    await this.audit(companyId, actor.sub, 'RECRUITMENT_DOCUMENT_DOWNLOADED', doc.applicationId, { documentId });
    return { stream: this.storage.stream(doc.fileKey), name: doc.fileName, type: doc.mimeType };
  }

  async review(companyId: string, actor: Actor, documentId: string, dto: { decision: 'APPROVED' | 'RETURNED'; reason?: string }) {
    const doc = await this.prisma.recruitmentDocument.findFirst({ where: { id: documentId, companyId }, select: { id: true, applicationId: true, status: true, supersededAt: true } });
    if (!doc) throw new NotFoundException('Documento nao encontrado.');
    await this.scope.assertApplication(companyId, actor, doc.applicationId);
    if (doc.supersededAt) throw new ConflictException('Este documento foi substituido por um envio mais recente.');
    const reason = dto.reason?.trim();
    if (dto.decision === 'RETURNED' && (!reason || reason.length < 5)) throw new BadRequestException('Informe o motivo da devolucao (minimo 5 caracteres).');
    // Decisao condicional ao estado lido: duas conferencias simultaneas nao se sobrepoem.
    const result = await this.prisma.recruitmentDocument.updateMany({
      where: { id: documentId, companyId, status: doc.status, supersededAt: null },
      data: { status: dto.decision, returnReason: dto.decision === 'RETURNED' ? reason : null, reviewedById: actor.sub, reviewedAt: new Date() },
    });
    if (!result.count) throw new ConflictException('O documento foi alterado por outra pessoa. Atualize e tente novamente.');
    await this.audit(companyId, actor.sub, `RECRUITMENT_DOCUMENT_${dto.decision}`, doc.applicationId, { documentId, reason: reason ?? null });
    return { id: documentId, status: dto.decision };
  }

  /** Selecionar nao contrata: apenas marca a candidatura para a conferencia documental. */
  async select(companyId: string, actor: Actor, applicationId: string) {
    await this.scope.assertApplication(companyId, actor, applicationId);
    const result = await this.prisma.application.updateMany({ where: { id: applicationId, companyId, forwardedAt: null }, data: { selectedAt: new Date(), selectedById: actor.sub } });
    if (!result.count) throw new ConflictException('A candidatura ja foi encaminhada ao RH da empresa.');
    await this.audit(companyId, actor.sub, 'RECRUITMENT_APPLICATION_SELECTED', applicationId, {});
    return { selected: true };
  }

  /**
   * Encaminha ao RH da empresa. Exige candidato selecionado e o documento mais recente de CADA item pedido aprovado.
   * Nao cria funcionario nem usuario: a admissao continua sendo decisao do RH da empresa.
   */
  async forward(companyId: string, actor: Actor, applicationId: string) {
    await this.scope.assertApplication(companyId, actor, applicationId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`forward:${applicationId}`}))`;
      const application = await tx.application.findFirst({ where: { id: applicationId, companyId }, select: { selectedAt: true, forwardedAt: true } });
      if (!application) throw new NotFoundException('Candidatura nao encontrada.');
      if (application.forwardedAt) return { forwarded: true, alreadyForwarded: true };
      if (!application.selectedAt) throw new ConflictException('Selecione o candidato antes de encaminhar.');

      const requests = await tx.recruitmentDocumentRequest.findMany({ where: { companyId, applicationId }, select: { items: true } });
      const labels = [...new Set(requests.flatMap((request) => request.items))];
      const docs = await tx.recruitmentDocument.findMany({ where: { companyId, applicationId, supersededAt: null }, select: { label: true, status: true } });
      const readiness = evaluateForwardReadiness(labels, new Map(docs.map((doc) => [doc.label, { status: doc.status }])));
      if (!readiness.ready) {
        throw new ConflictException({ code: 'DOCUMENTS_NOT_READY', message: 'Ha documentos pendentes de envio ou conferencia.', ...readiness });
      }

      await tx.application.update({ where: { id: applicationId }, data: { forwardedAt: new Date(), forwardedById: actor.sub } });
      await tx.recruitmentDocumentRequest.updateMany({ where: { companyId, applicationId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { companyId, userId: actor.sub, action: 'RECRUITMENT_APPLICATION_FORWARDED', entity: 'Application', entityId: applicationId, metadata: { items: labels } } });
      return { forwarded: true, alreadyForwarded: false };
    });
  }

  // ─── Area publica (somente o token) ─────────────────────────────────────

  private async activeRequest(token: string) {
    if (!TOKEN_SHAPE.test(token ?? '')) throw new NotFoundException(INVALID_LINK);
    const request = await this.prisma.recruitmentDocumentRequest.findUnique({
      where: { tokenHash: hashAccessToken(token) },
      select: { id: true, companyId: true, applicationId: true, items: true, expiresAt: true, revokedAt: true, application: { select: { forwardedAt: true, job: { select: { title: true, company: { select: { name: true } } } } } } },
    });
    if (!request || linkState(request) !== 'ACTIVE' || request.application.forwardedAt) throw new NotFoundException(INVALID_LINK);
    return request;
  }

  async publicView(token: string) {
    const request = await this.activeRequest(token);
    const docs = await this.prisma.recruitmentDocument.findMany({ where: { applicationId: request.applicationId, supersededAt: null }, select: { label: true, status: true, returnReason: true } });
    const byLabel = new Map(docs.map((doc) => [doc.label, doc]));
    return {
      company: request.application.job.company.name,
      jobTitle: request.application.job.title,
      expiresAt: request.expiresAt,
      items: request.items.map((label) => {
        const doc = byLabel.get(label);
        return { label, status: doc?.status ?? 'PENDING', returnReason: doc?.status === 'RETURNED' ? doc.returnReason : null };
      }),
    };
  }

  async publicUpload(token: string, label: string, file?: { buffer: Buffer }) {
    const request = await this.activeRequest(token);
    if (!request.items.includes(label)) throw new BadRequestException('Documento nao solicitado.');
    if (!file?.buffer?.length) throw new BadRequestException('Envie o arquivo do documento.');
    if (file.buffer.length > MAX_DOCUMENT_BYTES) throw new PayloadTooLargeException('O arquivo deve ter no maximo 5 MB.');
    const type = detectDocumentType(file.buffer);
    if (!type) throw new UnprocessableEntityException('Formato invalido. Envie PDF, PNG ou JPEG.');

    const current = await this.prisma.recruitmentDocument.findFirst({ where: { applicationId: request.applicationId, label, supersededAt: null }, select: { status: true } });
    if (current?.status === 'APPROVED') throw new ConflictException('Este documento ja foi aprovado.');

    await this.scanner.assertClean(file.buffer); // so entra no banco depois do scan

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const key = `${request.companyId}/documents/${request.applicationId}/${randomUUID()}.${type.extension}`;
    await this.storage.save(key, file.buffer);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`doc:${request.applicationId}:${label}`}))`;
        await tx.recruitmentDocument.updateMany({ where: { applicationId: request.applicationId, label, supersededAt: null }, data: { supersededAt: new Date() } });
        await tx.recruitmentDocument.create({
          data: { companyId: request.companyId, applicationId: request.applicationId, requestId: request.id, label, fileKey: key, fileName: safeDownloadName(label, type.extension), mimeType: type.mime, size: file.buffer.length, sha256 },
        });
      });
    } catch (error) {
      await this.storage.remove(key);
      throw error;
    }
    return { received: true };
  }

  private audit(companyId: string, userId: string, action: string, applicationId: string, metadata: Record<string, unknown>) {
    return this.prisma.auditLog.create({ data: { companyId, userId, action, entity: 'Application', entityId: applicationId, metadata: metadata as any } });
  }
}