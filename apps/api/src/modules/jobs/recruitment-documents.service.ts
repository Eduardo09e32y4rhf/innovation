import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, ServiceUnavailableException, Injectable, Logger, NotFoundException, Optional, PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { decryptForCompany, fileEncryptionAvailable, sealFile, encryptForCompany } from '../../common/crypto/file-crypto';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { candidateDocumentsEmail, candidateHiredEmail } from './recruitment-mails';
import { CandidateDocumentScanner } from './candidate-document-scanner.service';
import { JobScopeService } from './job-scope.service';
import { JobsStorageService } from './jobs-storage.service';
import { RecruitmentWorkflowService } from './recruitment-workflow.service';
import { canReadSensitive, formatsLabel, resolveRequiredDocuments, ruleForLabel, validateApproval, type DocType } from './recruitment-doc-types';
import { documentCodeEmail, documentApprovedEmail, documentReminderEmail, documentReturnedEmail } from './recruitment-documents.mails';
import { RecruiterNotifierService } from './recruiter-notifier.service';
import {
  CODE_COOLDOWN_SECONDS,
  CODE_MAX_ATTEMPTS,
  CODE_MINUTES,
  DEFAULT_LINK_DAYS,
  codeMatches,
  generateVerificationCode,
  hashVerificationCode,
  maskEmail,
  MAX_DOCUMENT_BYTES,
  MAX_LINK_DAYS,
  detectDocumentType,
  hireKitFor,
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
  private readonly logger = new Logger(RecruitmentDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: JobsStorageService,
    private readonly scanner: CandidateDocumentScanner,
    private readonly scope: JobScopeService,
    private readonly mail: MailService,
    @Optional() private readonly workflow?: RecruitmentWorkflowService,
    @Optional() private readonly notifier?: RecruiterNotifierService,
  ) {}

  private appBase() { return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''); }

  /** Contratacao: cria o link de documentos da admissao e manda o e-mail de parabens com ele. Nunca derruba a contratacao. */
  async sendHireWelcome(companyId: string, actorId: string, applicationId: string, startDate?: Date | string | null, contractType?: string | null): Promise<boolean> {
    try {
      const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { anonymizedAt: true, candidate: { select: { name: true, email: true } }, job: { select: { title: true, company: { select: { name: true } } } } } });
      if (!app || app.anonymizedAt || !app.candidate.email) return false;
      const items = normalizeItems(hireKitFor(contractType));
      const { token, hash } = generateAccessToken();
      const expiresAt = new Date(Date.now() + 14 * 86_400_000);
      await this.prisma.recruitmentDocumentRequest.create({ data: { companyId, applicationId, tokenHash: hash, items, expiresAt, createdById: actorId } });
      const fmt = (date: Date) => date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const result = await this.mail.send(app.candidate.email, candidateHiredEmail({ name: app.candidate.name, company: app.job.company.name, jobTitle: app.job.title, startDate: startDate ? fmt(new Date(startDate)) : null, documentsUrl: this.appBase() ? `${this.appBase()}/carreiras/documentos/${token}` : null, items, expires: fmt(expiresAt) }));
      await this.prisma.applicationEvent.create({ data: { applicationId, userId: actorId, type: 'HIRED_EMAIL', note: result.sent ? 'E-mail de contratação enviado ao candidato, com o link de documentos' : 'E-mail de contratação NÃO foi enviado (verifique o e-mail do candidato e o provedor de e-mail)' } });
      return result.sent;
    } catch { return false; }
  }

  // ─── Kit de documentos da admissao (RS-D-09) ────────────────────────────

  /** Lista exigida da vaga da candidatura (configurada na vaga ou kit do tipo de contrato), para pre-carregar o pedido. */
  async kitForApplication(companyId: string, actor: Actor, applicationId: string) {
    await this.scope.assertApplication(companyId, actor, applicationId);
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { job: { select: { requiredDocuments: true, employmentType: true } } } });
    if (!app) throw new NotFoundException('Candidatura nao encontrada.');
    const items = resolveRequiredDocuments(app.job);
    return { configured: Array.isArray(app.job.requiredDocuments) && (app.job.requiredDocuments as unknown[]).length > 0, employmentType: app.job.employmentType, items: items.map((item) => ({ ...item, docType: ruleForLabel(item.label).type })) };
  }

  /**
   * Usado pela contratacao: {required, approved, missing} (rotulos). `required` = itens obrigatorios da vaga (ou do kit do contrato)
   * mais tudo que ja foi pedido ao candidato; `approved` = com a versao vigente APROVADA; `missing` = required sem aprovacao.
   * `companyId` e opcional (filtra a candidatura quando o chamador ja o conhece).
   */
  async hiringKitStatus(applicationId: string, companyId?: string) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, ...(companyId ? { companyId } : {}) }, select: { companyId: true, job: { select: { requiredDocuments: true, employmentType: true } } } });
    if (!app) throw new NotFoundException('Candidatura nao encontrada.');
    const [requests, docs] = await Promise.all([
      this.prisma.recruitmentDocumentRequest.findMany({ where: { companyId: app.companyId, applicationId }, select: { items: true } }),
      this.prisma.recruitmentDocument.findMany({ where: { companyId: app.companyId, applicationId, supersededAt: null }, select: { label: true, status: true } }),
    ]);
    const required = [...new Set([...resolveRequiredDocuments(app.job).filter((item) => item.required).map((item) => item.label), ...requests.flatMap((request) => request.items)])];
    const approvedLabels = new Set(docs.filter((doc) => doc.status === 'APPROVED').map((doc) => doc.label));
    return { required, approved: required.filter((label) => approvedLabels.has(label)), missing: required.filter((label) => !approvedLabels.has(label)) };
  }

  // ─── Area interna (empresa + escopo da vaga) ────────────────────────────

  async createRequest(companyId: string, actor: Actor, applicationId: string, dto: { items: string[]; expiresInDays?: number; sendEmail?: boolean }) {
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
    let emailed = false;
    if (dto.sendEmail && this.appBase()) {
      const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { candidate: { select: { name: true, email: true } }, job: { select: { title: true, company: { select: { name: true } } } } } });
      if (app?.candidate.email) {
        const result = await this.mail.send(app.candidate.email, candidateDocumentsEmail({ name: app.candidate.name, company: app.job.company.name, jobTitle: app.job.title, items, url: `${this.appBase()}/carreiras/documentos/${token}`, expires: expiresAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) }));
        emailed = result.sent;
      }
    }
    await this.workflow?.completeRequiredAction(applicationId, 'REQUEST_DOCUMENTS', 'Checklist documental criado e enviado ao candidato.');
    return { ...request, token, path: `/carreiras/documentos/${token}`, emailed };
  }

  async listForApplication(companyId: string, actor: Actor, applicationId: string) {
    await this.scope.assertApplication(companyId, actor, applicationId);
    const [requests, documents, application] = await Promise.all([
      this.prisma.recruitmentDocumentRequest.findMany({ where: { companyId, applicationId }, orderBy: { createdAt: 'desc' }, select: { id: true, items: true, expiresAt: true, revokedAt: true, createdAt: true, reissuedFromId: true } }),
      this.prisma.recruitmentDocument.findMany({ where: { companyId, applicationId }, orderBy: { createdAt: 'desc' }, select: { id: true, requestId: true, label: true, status: true, fileName: true, mimeType: true, size: true, returnReason: true, reviewedAt: true, supersededAt: true, createdAt: true, docType: true, expiresAt: true, sensitive: true } }),
      this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { selectedAt: true, forwardedAt: true } }),
    ]);
    const now = new Date();
    const mayRead = canReadSensitive(actor.role);
    return {
      selectedAt: application?.selectedAt ?? null,
      forwardedAt: application?.forwardedAt ?? null,
      requests: requests.map((request) => ({ ...request, state: linkState(request, now) })),
      // Sensivel: quem nao e RH ve o estado, mas nao o nome do arquivo nem pode abrir (restricted).
      documents: documents.map((doc) => (doc.sensitive && !mayRead ? { ...doc, fileName: 'Documento sensível', restricted: true } : { ...doc, restricted: false })),
      canReadSensitive: mayRead,
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
    const doc = await this.prisma.recruitmentDocument.findFirst({ where: { id: documentId, companyId }, select: { id: true, applicationId: true, fileKey: true, fileName: true, mimeType: true, encrypted: true, sensitive: true, legalBasis: true, docType: true } });
    if (!doc) throw new NotFoundException('Documento nao encontrado.');
    await this.scope.assertApplication(companyId, actor, doc.applicationId);
    if (doc.sensitive && !canReadSensitive(actor.role)) throw new ForbiddenException('Documento sensivel: somente o RH pode abrir.');
    // RS-D-08: leitura de dado sensivel e auditada com a base legal; nunca registra URL, nome do arquivo ou conteudo.
    await this.audit(companyId, actor.sub, doc.sensitive ? 'RECRUITMENT_SENSITIVE_DOCUMENT_READ' : 'RECRUITMENT_DOCUMENT_DOWNLOADED', doc.applicationId, { documentId, ...(doc.sensitive ? { docType: doc.docType, legalBasis: doc.legalBasis } : {}) });
    return { stream: Readable.from(await this.openFile(companyId, doc)), name: doc.fileName, type: doc.mimeType };
  }

  /** Le o arquivo decifrado (ou legado em texto plano). Arquivo legado e cifrado na propria leitura (migracao preguicosa). */
  async openFile(companyId: string, doc: { id: string; fileKey: string; encrypted: boolean }): Promise<Buffer> {
    const raw = await this.storage.read(doc.fileKey);
    const plain = decryptForCompany(raw, companyId);
    if (!doc.encrypted) await this.sealLegacy(companyId, doc, plain);
    return plain;
  }

  private async sealLegacy(companyId: string, doc: { id: string; fileKey: string }, plain: Buffer): Promise<boolean> {
    if (!fileEncryptionAvailable()) return false;
    try {
      await this.storage.replace(doc.fileKey, encryptForCompany(plain, companyId));
      await this.prisma.recruitmentDocument.updateMany({ where: { id: doc.id, companyId }, data: { encrypted: true } });
      return true;
    } catch (error) {
      this.logger.warn(`Nao foi possivel cifrar o arquivo antigo do documento ${doc.id}: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  /** Migracao em lote dos arquivos antigos (cron diario): cifra ate `limit` documentos que ainda estao em texto plano. */
  async encryptLegacyFiles(limit = 200): Promise<{ encrypted: number }> {
    if (!fileEncryptionAvailable()) return { encrypted: 0 };
    const rows = await this.prisma.recruitmentDocument.findMany({ where: { encrypted: false }, take: limit, orderBy: { createdAt: 'asc' }, select: { id: true, companyId: true, fileKey: true } });
    let encrypted = 0;
    for (const row of rows) {
      try {
        const plain = decryptForCompany(await this.storage.read(row.fileKey), row.companyId);
        if (await this.sealLegacy(row.companyId, row, plain)) encrypted += 1;
      } catch (error) {
        this.logger.warn(`Arquivo antigo ${row.id} nao migrado: ${error instanceof Error ? error.message : error}`);
      }
    }
    return { encrypted };
  }

  async review(companyId: string, actor: Actor, documentId: string, dto: { decision: 'APPROVED' | 'RETURNED'; reason?: string; expiresAt?: string | Date | null }) {
    const doc = await this.prisma.recruitmentDocument.findFirst({ where: { id: documentId, companyId }, select: { id: true, applicationId: true, status: true, supersededAt: true, label: true, docType: true, sensitive: true } });
    if (!doc) throw new NotFoundException('Documento nao encontrado.');
    await this.scope.assertApplication(companyId, actor, doc.applicationId);
    if (doc.sensitive && !canReadSensitive(actor.role)) throw new ForbiddenException('Documento sensivel: somente o RH pode conferir.');
    if (doc.supersededAt) throw new ConflictException('Este documento foi substituido por um envio mais recente.');
    const reason = dto.reason?.trim();
    if (dto.decision === 'RETURNED' && (!reason || reason.length < 5)) throw new BadRequestException('Informe o motivo da devolucao (minimo 5 caracteres).');
    const docType = (doc.docType as DocType | null) ?? ruleForLabel(doc.label).type;
    let expiresAt: Date | null = null;
    if (dto.decision === 'APPROVED') {
      if (dto.expiresAt) {
        expiresAt = new Date(dto.expiresAt);
        if (Number.isNaN(expiresAt.getTime())) throw new BadRequestException('Vencimento invalido.');
      }
      const problem = validateApproval({ docType, expiresAt });
      if (problem) throw new BadRequestException(problem);
    }
    // Decisao condicional ao estado lido: duas conferencias simultaneas nao se sobrepoem.
    const result = await this.prisma.recruitmentDocument.updateMany({
      where: { id: documentId, companyId, status: doc.status, supersededAt: null },
      data: { status: dto.decision, returnReason: dto.decision === 'RETURNED' ? reason : null, reviewedById: actor.sub, reviewedAt: new Date(), expiresAt, expiryAlertedAt: null, docType },
    });
    if (!result.count) throw new ConflictException('O documento foi alterado por outra pessoa. Atualize e tente novamente.');
    await this.audit(companyId, actor.sub, `RECRUITMENT_DOCUMENT_${dto.decision}`, doc.applicationId, { documentId, reason: reason ?? null, docType, expiresAt });
    const emailed = await this.notifyCandidateOfReview(companyId, actor.sub, doc.applicationId, doc.label, dto.decision, reason);
    return { id: documentId, status: dto.decision, emailed };
  }

  /** RS-D-07: avisa o candidato por e-mail (aprovado, ou devolvido com motivo e link novo). Falha de e-mail nunca desfaz a conferencia. */
  private async notifyCandidateOfReview(companyId: string, actorId: string, applicationId: string, label: string, decision: 'APPROVED' | 'RETURNED', reason?: string): Promise<boolean> {
    try {
      const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { forwardedAt: true, anonymizedAt: true, candidate: { select: { name: true, email: true } }, job: { select: { title: true, company: { select: { name: true } } } } } });
      if (!app || app.anonymizedAt || !app.candidate.email) return false;
      const base = { name: app.candidate.name, company: app.job.company.name, jobTitle: app.job.title, label };
      if (decision === 'APPROVED') {
        const status = await this.hiringKitStatus(applicationId, companyId);
        const result = await this.mail.send(app.candidate.email, documentApprovedEmail({ ...base, missing: status.missing.filter((item) => item !== label).length }));
        return result.sent;
      }
      let url: string | null = null;
      let expires: string | null = null;
      if (!app.forwardedAt && this.appBase()) {
        const fresh = await this.issueRequest(companyId, applicationId, actorId, { items: [label], days: DEFAULT_LINK_DAYS, keepVerification: true });
        url = `${this.appBase()}/carreiras/documentos/${fresh.token}`;
        expires = this.fmtDay(fresh.expiresAt);
      }
      const result = await this.mail.send(app.candidate.email, documentReturnedEmail({ ...base, reason: reason ?? '', url, expires }));
      return result.sent;
    } catch (error) {
      this.logger.warn(`E-mail de conferencia nao enviado (${applicationId}): ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  private fmtDay(date: Date) { return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); }

  /** Cria um link novo (so o hash fica no banco). `reissuedFromId` encadeia o historico. */
  private async issueRequest(companyId: string, applicationId: string, createdById: string, input: { items: string[]; days?: number; expiresAt?: Date; reissuedFromId?: string; reminders?: boolean; keepVerification?: boolean }) {
    const { token, hash } = generateAccessToken();
    const expiresAt = input.expiresAt ?? new Date(Date.now() + (input.days ?? DEFAULT_LINK_DAYS) * 86_400_000);
    const now = new Date();
    // Link enviado pelo sistema ao mesmo e-mail ja confirmado (lembrete, devolucao) herda a confirmacao; o do RH nao.
    const prior = input.keepVerification ? await this.prisma.recruitmentDocumentRequest.findFirst({ where: { companyId, applicationId, verifiedAt: { not: null } }, orderBy: { verifiedAt: 'desc' }, select: { verifiedAt: true } }) : null;
    const created = await this.prisma.recruitmentDocumentRequest.create({
      data: { companyId, applicationId, tokenHash: hash, items: input.items, expiresAt, createdById, reissuedFromId: input.reissuedFromId ?? null, verifiedAt: prior?.verifiedAt ?? null, ...(input.reminders ? { reminderD3At: now, reminderD1At: now } : {}) },
      select: { id: true, items: true, expiresAt: true },
    });
    return { ...created, token };
  }

  /** RS-C-05: reemite o link (revoga o antigo, mantendo a linha e o historico dos documentos ja enviados). */
  async reissueRequest(companyId: string, actor: Actor, requestId: string, dto: { expiresInDays?: number; sendEmail?: boolean } = {}) {
    const old = await this.prisma.recruitmentDocumentRequest.findFirst({ where: { id: requestId, companyId }, select: { id: true, applicationId: true, items: true } });
    if (!old) throw new NotFoundException('Link nao encontrado.');
    await this.scope.assertApplication(companyId, actor, old.applicationId);
    const application = await this.prisma.application.findFirst({ where: { id: old.applicationId, companyId }, select: { forwardedAt: true, anonymizedAt: true, candidate: { select: { name: true, email: true } }, job: { select: { title: true, company: { select: { name: true } } } } } });
    if (!application || application.anonymizedAt) throw new NotFoundException('Candidatura nao encontrada.');
    if (application.forwardedAt) throw new ConflictException('A candidatura ja foi encaminhada ao RH da empresa.');
    const days = Math.min(Math.max(Math.trunc(dto.expiresInDays ?? DEFAULT_LINK_DAYS), 1), MAX_LINK_DAYS);
    const fresh = await this.issueRequest(companyId, old.applicationId, actor.sub, { items: old.items, days, reissuedFromId: old.id });
    await this.prisma.recruitmentDocumentRequest.updateMany({ where: { id: old.id, companyId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit(companyId, actor.sub, 'RECRUITMENT_DOCUMENT_LINK_REISSUED', old.applicationId, { requestId: old.id, newRequestId: fresh.id, expiresAt: fresh.expiresAt });
    let emailed = false;
    if (dto.sendEmail && this.appBase() && application.candidate.email) {
      const result = await this.mail.send(application.candidate.email, candidateDocumentsEmail({ name: application.candidate.name, company: application.job.company.name, jobTitle: application.job.title, items: old.items, url: `${this.appBase()}/carreiras/documentos/${fresh.token}`, expires: this.fmtDay(fresh.expiresAt) }));
      emailed = result.sent;
    }
    return { id: fresh.id, items: fresh.items, expiresAt: fresh.expiresAt, token: fresh.token, path: `/carreiras/documentos/${fresh.token}`, emailed };
  }

  /**
   * RS-D-07: cron diario. Para cada candidatura com link ativo, pendencias do candidato (sem envio ou devolvidas) e vencimento em 3 ou 1 dia,
   * manda UM lembrete com link novo (o token antigo e so hash) e avisa o RH. Cada marco (D-3, D-1) dispara uma vez por link.
   */
  async sendLinkReminders(now: Date = new Date()): Promise<{ reminded: number }> {
    const horizon = new Date(now.getTime() + 3 * 86_400_000);
    const candidates = await this.prisma.recruitmentDocumentRequest.findMany({
      where: { revokedAt: null, expiresAt: { gt: now, lte: horizon }, application: { is: { forwardedAt: null, anonymizedAt: null } } },
      orderBy: { expiresAt: 'desc' },
      take: 500,
      select: { id: true, companyId: true, applicationId: true, items: true, expiresAt: true, createdById: true, reminderD3At: true, reminderD1At: true, application: { select: { jobId: true, candidate: { select: { name: true, email: true } }, job: { select: { title: true, company: { select: { name: true } } } } } } },
    });
    const latest = new Map<string, (typeof candidates)[number]>();
    for (const request of candidates) if (!latest.has(request.applicationId)) latest.set(request.applicationId, request);
    let reminded = 0;
    for (const request of latest.values()) {
      try {
        const daysLeft = Math.max(1, Math.ceil((request.expiresAt.getTime() - now.getTime()) / 86_400_000));
        const stage = daysLeft <= 1 ? 'D1' : 'D3';
        if (stage === 'D1' ? request.reminderD1At : request.reminderD3At || request.reminderD1At) continue;
        const docs = await this.prisma.recruitmentDocument.findMany({ where: { applicationId: request.applicationId, supersededAt: null }, select: { label: true, status: true } });
        const byLabel = new Map(docs.map((doc) => [doc.label, doc.status]));
        const pending = request.items.filter((label) => { const status = byLabel.get(label); return !status || status === 'RETURNED'; });
        if (!pending.length) continue;
        const marker = stage === 'D1' ? { reminderD3At: now, reminderD1At: now } : { reminderD3At: now };
        const claimed = await this.prisma.recruitmentDocumentRequest.updateMany({ where: { id: request.id, ...(stage === 'D1' ? { reminderD1At: null } : { reminderD3At: null }) }, data: marker });
        if (!claimed.count) continue; // outra instancia ja cuidou deste marco
        const fresh = await this.issueRequest(request.companyId, request.applicationId, request.createdById, { items: request.items, expiresAt: request.expiresAt, reissuedFromId: request.id, reminders: true, keepVerification: true });
        let sent = false;
        const email = request.application.candidate.email;
        if (email && this.appBase()) {
          const result = await this.mail.send(email, documentReminderEmail({ name: request.application.candidate.name, company: request.application.job.company.name, jobTitle: request.application.job.title, pending, url: `${this.appBase()}/carreiras/documentos/${fresh.token}`, expires: this.fmtDay(request.expiresAt), daysLeft }));
          sent = result.sent;
        }
        await this.notifier?.notify({ companyId: request.companyId, jobId: request.application.jobId, userIds: [request.createdById], kind: 'DOCUMENT_REMINDER', title: 'Candidato com documentos pendentes', lines: [`${request.application.candidate.name} ainda não enviou: ${pending.join(', ')}.`, `O link vence em ${daysLeft === 1 ? '1 dia' : `${daysLeft} dias`}. ${sent ? 'Um lembrete foi enviado ao candidato.' : 'O lembrete por e-mail NÃO foi enviado (sem e-mail ou provedor).'}`] });
        await this.audit(request.companyId, request.createdById, 'RECRUITMENT_DOCUMENT_REMINDER_SENT', request.applicationId, { requestId: request.id, stage, pending: pending.length, emailed: sent });
        reminded += 1;
      } catch (error) {
        this.logger.warn(`Lembrete de documentos falhou (${request.applicationId}): ${error instanceof Error ? error.message : error}`);
      }
    }
    return { reminded };
  }

  /**
   * RS-D-11: documentos aprovados que acompanham validade (CNH, certidoes, vacina, ASO) e vencem em ate `windowDays`:
   * avisa o RH uma vez (e de novo se o vencimento for alterado na reconferencia).
   */
  async alertExpiringDocuments(now: Date = new Date(), windowDays = 30): Promise<{ alerted: number }> {
    const until = new Date(now.getTime() + windowDays * 86_400_000);
    const due = await this.prisma.recruitmentDocument.findMany({
      where: { status: 'APPROVED', supersededAt: null, expiryAlertedAt: null, expiresAt: { not: null, lte: until } },
      orderBy: { expiresAt: 'asc' },
      take: 500,
      select: { id: true, companyId: true, applicationId: true, label: true, expiresAt: true, reviewedById: true, application: { select: { jobId: true, candidate: { select: { name: true } } } } },
    });
    let alerted = 0;
    for (const doc of due) {
      try {
        const expired = doc.expiresAt!.getTime() < now.getTime();
        const claimed = await this.prisma.recruitmentDocument.updateMany({ where: { id: doc.id, expiryAlertedAt: null }, data: { expiryAlertedAt: now } });
        if (!claimed.count) continue;
        await this.notifier?.notify({ companyId: doc.companyId, jobId: doc.application.jobId, userIds: [doc.reviewedById], kind: 'DOCUMENT_EXPIRY', priority: expired ? 'HIGH' : 'NORMAL', title: expired ? 'Documento vencido' : 'Documento perto de vencer', lines: [`${doc.application.candidate.name}: ${doc.label} ${expired ? 'venceu' : 'vence'} em ${this.fmtDay(doc.expiresAt!)}.`, 'Peça um documento atualizado ao candidato.'] });
        await this.audit(doc.companyId, doc.reviewedById, 'RECRUITMENT_DOCUMENT_EXPIRY_ALERT', doc.applicationId, { documentId: doc.id, expiresAt: doc.expiresAt });
        alerted += 1;
      } catch (error) {
        this.logger.warn(`Alerta de vencimento falhou (${doc.id}): ${error instanceof Error ? error.message : error}`);
      }
    }
    return { alerted };
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
      select: { id: true, companyId: true, applicationId: true, items: true, expiresAt: true, revokedAt: true, verifiedAt: true, codeHash: true, codeExpiresAt: true, codeAttempts: true, codeSentAt: true, application: { select: { forwardedAt: true, candidate: { select: { name: true, email: true } }, job: { select: { title: true, company: { select: { name: true } } } } } } },
    });
    if (!request || linkState(request) !== 'ACTIVE' || request.application.forwardedAt) throw new NotFoundException(INVALID_LINK);
    return request;
  }

  /** RS-D-17: com e-mail cadastrado, o envio exige o codigo enviado a ele. Sem e-mail (nada a verificar) vale so o link. */
  private needsCode(request: { verifiedAt?: Date | null; application?: { candidate?: { email?: string | null } | null } }) {
    return Boolean(request.application?.candidate?.email) && !request.verifiedAt;
  }

  private assertVerified(request: Parameters<RecruitmentDocumentsService['needsCode']>[0]) {
    if (this.needsCode(request)) throw new ForbiddenException({ code: 'CODE_REQUIRED', message: 'Confirme o codigo enviado ao seu e-mail antes de enviar documentos.' });
  }

  async sendVerificationCode(token: string, now: Date = new Date()) {
    const request = await this.activeRequest(token);
    const email = request.application.candidate?.email;
    if (!email) throw new BadRequestException('Este processo nao tem e-mail cadastrado. Fale com o RH.');
    if (request.verifiedAt) return { verified: true, sent: false, emailHint: maskEmail(email) };
    if (request.codeSentAt && now.getTime() - request.codeSentAt.getTime() < CODE_COOLDOWN_SECONDS * 1000) {
      throw new HttpException('Aguarde um minuto para pedir outro codigo.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const code = generateVerificationCode();
    await this.prisma.recruitmentDocumentRequest.update({ where: { id: request.id }, data: { codeHash: hashVerificationCode(request.id, code), codeExpiresAt: new Date(now.getTime() + CODE_MINUTES * 60_000), codeAttempts: 0, codeSentAt: now } });
    const result = await this.mail.send(email, documentCodeEmail({ name: request.application.candidate!.name.split(' ')[0], code, minutes: CODE_MINUTES }));
    if (!result.sent) throw new ServiceUnavailableException('Nao foi possivel enviar o codigo agora. Tente novamente em alguns minutos.');
    return { verified: false, sent: true, emailHint: maskEmail(email) };
  }

  async verifyCode(token: string, code: string, now: Date = new Date()) {
    const request = await this.activeRequest(token);
    if (request.verifiedAt) return { verified: true };
    if (!request.codeHash || !request.codeExpiresAt || request.codeExpiresAt.getTime() < now.getTime()) throw new BadRequestException('Codigo expirado ou nao solicitado. Peca um novo codigo.');
    if (request.codeAttempts >= CODE_MAX_ATTEMPTS) throw new HttpException('Muitas tentativas. Peca um novo codigo.', HttpStatus.TOO_MANY_REQUESTS);
    // Conta a tentativa antes de comparar (condicional: tentativas simultaneas nao passam do limite).
    const counted = await this.prisma.recruitmentDocumentRequest.updateMany({ where: { id: request.id, codeAttempts: { lt: CODE_MAX_ATTEMPTS } }, data: { codeAttempts: { increment: 1 } } });
    if (!counted.count) throw new HttpException('Muitas tentativas. Peca um novo codigo.', HttpStatus.TOO_MANY_REQUESTS);
    if (!/^\d{6}$/.test(String(code ?? '').trim()) || !codeMatches(request.id, code, request.codeHash)) throw new BadRequestException('Codigo incorreto.');
    await this.prisma.recruitmentDocumentRequest.update({ where: { id: request.id }, data: { verifiedAt: now, codeHash: null, codeExpiresAt: null } });
    return { verified: true };
  }

  async publicView(token: string) {
    const request = await this.activeRequest(token);
    const docs = await this.prisma.recruitmentDocument.findMany({ where: { applicationId: request.applicationId, supersededAt: null }, select: { label: true, status: true, returnReason: true } });
    const byLabel = new Map(docs.map((doc) => [doc.label, doc]));
    const email = request.application.candidate?.email;
    return {
      company: request.application.job.company.name,
      jobTitle: request.application.job.title,
      expiresAt: request.expiresAt,
      verification: { required: Boolean(email), verified: Boolean(request.verifiedAt) || !email, emailHint: email ? maskEmail(email) : null },
      items: request.items.map((label) => {
        const doc = byLabel.get(label);
        const rule = ruleForLabel(label);
        return { label, status: doc?.status ?? 'PENDING', returnReason: doc?.status === 'RETURNED' ? doc.returnReason : null, accepts: formatsLabel(rule.formats), sensitive: rule.sensitive, legalBasis: rule.sensitive ? rule.legalBasis : null };
      }),
    };
  }

  async publicUpload(token: string, label: string, file?: { buffer: Buffer }) {
    const request = await this.activeRequest(token);
    this.assertVerified(request);
    if (!request.items.includes(label)) throw new BadRequestException('Documento nao solicitado.');
    if (!file?.buffer?.length) throw new BadRequestException('Envie o arquivo do documento.');
    if (file.buffer.length > MAX_DOCUMENT_BYTES) throw new PayloadTooLargeException('O arquivo deve ter no maximo 5 MB.');
    const rule = ruleForLabel(label);
    const type = detectDocumentType(file.buffer, rule.formats);
    if (!type) throw new UnprocessableEntityException(`Formato invalido para este documento. Envie ${formatsLabel(rule.formats)}.`);

    const current = await this.prisma.recruitmentDocument.findFirst({ where: { applicationId: request.applicationId, label, supersededAt: null }, select: { status: true } });
    if (current?.status === 'APPROVED') throw new ConflictException('Este documento ja foi aprovado.');

    await this.scanner.assertClean(file.buffer); // so entra no banco depois do scan

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const key = `${request.companyId}/documents/${request.applicationId}/${randomUUID()}.${type.extension}`;
    const sealed = sealFile(file.buffer, request.companyId); // RS-D-14: AES-256-GCM com chave por empresa
    try { await this.storage.save(key, sealed.data); } catch (error) { this.logger.error(`Documento do candidato: falha ao gravar o arquivo (candidatura ${request.applicationId}): ${(error as { code?: string; name?: string })?.code ?? (error as Error)?.name ?? 'erro'}`); throw error; }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`doc:${request.applicationId}:${label}`}))`;
        await tx.recruitmentDocument.updateMany({ where: { applicationId: request.applicationId, label, supersededAt: null }, data: { supersededAt: new Date() } });
        await tx.recruitmentDocument.create({
          data: { companyId: request.companyId, applicationId: request.applicationId, requestId: request.id, label, fileKey: key, fileName: safeDownloadName(label, type.extension), mimeType: type.mime, size: file.buffer.length, sha256, encrypted: sealed.encrypted, docType: rule.type, sensitive: rule.sensitive, legalBasis: rule.legalBasis },
        });
      });
    } catch (error) {
      this.logger.error(`Documento do candidato: falha ao gravar no banco (${request.applicationId}): ${(error as { code?: string; name?: string })?.code ?? (error as Error)?.name ?? 'erro'}`);
      await this.storage.remove(key);
      throw error;
    }
    return { received: true };
  }

  private audit(companyId: string, userId: string | null, action: string, applicationId: string, metadata: Record<string, unknown>) {
    return this.prisma.auditLog.create({ data: { companyId, userId, action, entity: 'Application', entityId: applicationId, metadata: metadata as any } });
  }
}
