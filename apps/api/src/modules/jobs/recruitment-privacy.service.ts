import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createHash, randomBytes } from 'node:crypto';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { JobsStorageService } from './jobs-storage.service';
import { buildInterviewIcs, formatInterviewDate, googleCalendarUrl, interviewerLabel, mailFromAddress, mapsUrl, meetingProvider } from './interview-rules';
import { applicationDuplicateEmail, applicationReceivedEmail, applicationRejectedEmail, candidateInterviewCanceledEmail, candidateInterviewEmail, candidateRequestAnsweredEmail, candidateRequestConfirmEmail } from './recruitment-mails';
import {
  clampRetention, DEFAULT_RETENTION_MONTHS, monthsAgo, phoneKey, GENDER_OPTIONS, newTrackingToken, parsePcd, pickOption, PRIVACY_VERSION, RACE_OPTIONS, REJECTION_CODES,
  REQUEST_TYPES, retentionDate, STAGE_LABEL_FOR_CANDIDATE, type RequestType,
} from './recruitment-privacy';

const VERIFICATION_TTL_MS = 2 * 3_600_000;
/** LGPD art. 19, II: resposta completa em ate 15 dias. */
export const REQUEST_DEADLINE_DAYS = 15;
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const appBase = () => (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

@Injectable()
export class RecruitmentPrivacyService {
  private readonly logger = new Logger(RecruitmentPrivacyService.name);

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService, private readonly storage: JobsStorageService) {}

  // ---------- configuração ----------
  async getSettings(companyId: string) {
    const row = await this.prisma.recruitmentSetting.findUnique({ where: { companyId } });
    return { retentionMonths: row?.retentionMonths ?? DEFAULT_RETENTION_MONTHS, receiptEmail: row?.receiptEmail ?? true, rejectionEmail: row?.rejectionEmail ?? true, rejectionMessage: row?.rejectionMessage ?? '', privacyVersion: PRIVACY_VERSION, rejectionCodes: REJECTION_CODES };
  }

  async saveSettings(companyId: string, dto: { retentionMonths?: number; receiptEmail?: boolean; rejectionEmail?: boolean; rejectionMessage?: string }) {
    const data = {
      ...(dto.retentionMonths !== undefined ? { retentionMonths: clampRetention(dto.retentionMonths) } : {}),
      ...(dto.receiptEmail !== undefined ? { receiptEmail: Boolean(dto.receiptEmail) } : {}),
      ...(dto.rejectionEmail !== undefined ? { rejectionEmail: Boolean(dto.rejectionEmail) } : {}),
      ...(dto.rejectionMessage !== undefined ? { rejectionMessage: String(dto.rejectionMessage).trim().slice(0, 1500) || null } : {}),
    };
    await this.prisma.recruitmentSetting.upsert({ where: { companyId }, create: { companyId, ...data }, update: data });
    return this.getSettings(companyId);
  }

  // ---------- candidatura recebida ----------
  /** Chamado logo depois de gravar a candidatura: versão do consentimento, prazo de retenção, link de acompanhamento, diversidade e e-mail. Nunca derruba a candidatura. */
  async afterApply(applicationId: string, extra: { gender?: unknown; race?: unknown; pcd?: unknown } = {}) {
    try {
      const app = await this.prisma.application.findUnique({ where: { id: applicationId }, include: { candidate: true, job: { include: { company: { select: { name: true } } } } } });
      if (!app) return;
      const settings = await this.getSettings(app.companyId);
      const token = newTrackingToken(randomBytes(20).toString('hex'));
      await this.prisma.application.update({ where: { id: app.id }, data: { trackingToken: token, consentVersion: app.consentGiven ? PRIVACY_VERSION : null, retentionUntil: retentionDate(settings.retentionMonths) } });
      await this.flagDuplicates(app.id, app.companyId, app.candidate.id, app.candidate.phone);
      const gender = pickOption(GENDER_OPTIONS, extra.gender); const race = pickOption(RACE_OPTIONS, extra.race); const pcd = parsePcd(extra.pcd);
      if (gender || race || pcd !== null) await this.prisma.candidateDiversity.upsert({ where: { applicationId: app.id }, create: { applicationId: app.id, companyId: app.companyId, gender, race, pcd }, update: { gender, race, pcd } });
      if (settings.receiptEmail && app.candidate.email) {
        await this.mail.send(app.candidate.email, applicationReceivedEmail({ name: app.candidate.name, jobTitle: app.job.title, company: app.job.company.name, statusUrl: `${appBase()}/carreiras/acompanhar/${token}`, privacyUrl: `${appBase()}/carreiras/privacidade` }));
      }
    } catch (error) {
      this.logger.error(`Pós-candidatura falhou (${applicationId}): ${error instanceof Error ? error.message : error}`);
    }
  }

  /** RS-C-12: alguem enviou de novo uma candidatura ja existente para este e-mail; so o dono do e-mail fica sabendo. Nunca derruba a requisicao. */
  async notifyDuplicateApply(applicationId: string) {
    try {
      const app = await this.prisma.application.findUnique({ where: { id: applicationId }, include: { candidate: true, job: { include: { company: { select: { name: true } } } } } });
      if (!app || app.anonymizedAt || !app.candidate.email) return;
      await this.mail.send(app.candidate.email, applicationDuplicateEmail({ name: app.candidate.name, jobTitle: app.job.title, company: app.job.company.name, accountUrl: `${appBase()}/carreiras/conta`, privacyUrl: `${appBase()}/carreiras/privacidade` }));
    } catch (error) {
      this.logger.error(`Aviso de candidatura repetida falhou (${applicationId}): ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Mesmo telefone em outro cadastro da empresa: avisa o RH na linha do tempo (pode ser a mesma pessoa com outro e-mail). */
  private async flagDuplicates(applicationId: string, companyId: string, candidateId: string, phone: string | null) {
    const key = phoneKey(phone);
    if (!key) return;
    const others = await this.prisma.candidate.findMany({ where: { companyId, id: { not: candidateId }, phone: { not: null } }, select: { name: true, phone: true }, take: 2000 });
    const same = others.filter((other) => phoneKey(other.phone) === key);
    if (same.length) await this.prisma.applicationEvent.create({ data: { applicationId, type: 'DUPLICATE_SUSPECT', note: `Possível cadastro duplicado: mesmo telefone de . Confira antes de seguir.` } });
  }

  /** Feedback automático de reprovação (boa experiência do candidato). */
  async afterRejected(applicationId: string) {
    try {
      const app = await this.prisma.application.findUnique({ where: { id: applicationId }, include: { candidate: true, job: { include: { company: { select: { name: true } } } } } });
      if (!app || app.status !== 'REJECTED' || app.anonymizedAt || !app.candidate.email) return;
      const already = await this.prisma.applicationEvent.count({ where: { applicationId, type: 'REJECTION_EMAIL_SENT' } });
      if (already) return;
      const settings = await this.getSettings(app.companyId);
      if (!settings.rejectionEmail) return;
      const result = await this.mail.send(app.candidate.email, applicationRejectedEmail({ name: app.candidate.name, jobTitle: app.job.title, company: app.job.company.name, message: settings.rejectionMessage, privacyUrl: `${appBase()}/carreiras/privacidade` }));
      if (result.sent) await this.prisma.applicationEvent.create({ data: { applicationId, type: 'REJECTION_EMAIL_SENT', note: 'Feedback de reprovação enviado ao candidato' } });
    } catch (error) {
      this.logger.error(`E-mail de reprovação falhou (${applicationId}): ${error instanceof Error ? error.message : error}`);
    }
  }

  // ---------- entrevista ----------
  /**
   * Convite (ou cancelamento) de entrevista por e-mail. Nunca derruba o agendamento: devolve se o e-mail saiu.
   * Registra na linha do tempo do candidato para o RH saber que ele foi avisado.
   */
  async sendInterviewEmail(
    applicationId: string,
    interview: { id?: string; responseToken?: string | null; scheduledAt: Date; mode: string | null; location: string | null; meetingUrl: string | null; durationMinutes: number | null; interviewerRole: string | null; interviewer: string | null; candidateMessage: string | null },
    kind: 'SCHEDULED' | 'CANCELED' | 'REMINDER',
  ): Promise<boolean> {
    try {
      if (interview.mode !== 'PRESENCIAL' && interview.mode !== 'ONLINE') return false;
      const app = await this.prisma.application.findUnique({ where: { id: applicationId }, include: { candidate: true, job: { include: { company: { select: { name: true } } } } } });
      if (!app || app.anonymizedAt || !app.candidate.email) return false;
      const when = formatInterviewDate(interview.scheduledAt);
      const base = { name: app.candidate.name, company: app.job.company.name, jobTitle: app.job.title, when };
      const minutes = interview.durationMinutes ?? 60;
      const title = `Entrevista: ${app.job.title} (${app.job.company.name})`;
      const where = interview.mode === 'ONLINE' ? interview.meetingUrl : interview.location;
      const ics = (cancel: boolean) => interview.id ? [{
        filename: cancel ? 'entrevista-cancelada.ics' : 'entrevista.ics',
        contentType: `text/calendar; charset=utf-8; method=${cancel ? 'CANCEL' : 'REQUEST'}`,
        content: buildInterviewIcs({ uid: interview.id, start: interview.scheduledAt, minutes, title, description: interview.mode === 'ONLINE' ? `Entrevista online: ${interview.meetingUrl}` : `Entrevista presencial: ${interview.location}`, location: where, url: interview.mode === 'ONLINE' ? interview.meetingUrl : null, organizerEmail: mailFromAddress(), attendeeEmail: app.candidate.email, cancel }),
      }] : undefined;
      if (kind === 'CANCELED') {
        const result = await this.mail.send(app.candidate.email, { ...candidateInterviewCanceledEmail(base), attachments: ics(true) });
        if (result.sent) await this.prisma.applicationEvent.create({ data: { applicationId, type: 'INTERVIEW_CANCEL_EMAIL_SENT', note: `Candidato avisado do cancelamento da entrevista de ${when.short}` } });
        return result.sent;
      }
      const provider = interview.meetingUrl ? meetingProvider(interview.meetingUrl) : null;
      const calendarUrl = googleCalendarUrl({
        title,
        start: interview.scheduledAt,
        minutes,
        details: interview.mode === 'ONLINE' ? `Entrevista online${provider ? ` (${provider})` : ''}: ${interview.meetingUrl}` : `Entrevista presencial: ${interview.location}`,
        location: where,
      });
      const reminder = kind === 'REMINDER';
      const mail = candidateInterviewEmail({
        ...base,
        durationMinutes: minutes,
        mode: interview.mode,
        location: interview.location,
        mapsUrl: interview.mode === 'PRESENCIAL' && interview.location ? mapsUrl(interview.location) : null,
        meetingUrl: interview.meetingUrl,
        meetingProvider: provider,
        interviewer: interviewerLabel(interview.interviewerRole, interview.interviewer),
        message: interview.candidateMessage,
        calendarUrl,
        statusUrl: app.trackingToken && appBase() ? `${appBase()}/carreiras/acompanhar/${app.trackingToken}` : null,
        responseUrl: interview.responseToken && appBase() ? `${appBase()}/carreiras/entrevista/${interview.responseToken}` : null,
        reminder,
      });
      // O lembrete nao reenvia o .ics (evita evento duplicado na agenda do candidato).
      const result = await this.mail.send(app.candidate.email, { ...mail, attachments: reminder ? undefined : ics(false) });
      if (result.sent) await this.prisma.applicationEvent.create({ data: { applicationId, type: reminder ? 'INTERVIEW_REMINDER_SENT' : 'INTERVIEW_EMAIL_SENT', note: reminder ? `Lembrete da entrevista de ${when.short} enviado ao candidato` : `Convite de entrevista enviado ao candidato (${when.short}, ${interview.mode === 'ONLINE' ? 'online' : 'presencial'})` } });
      return result.sent;
    } catch (error) {
      this.logger.error(`E-mail de entrevista falhou (${applicationId}): ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  // ---------- portal do candidato ----------
  async publicStatus(token: string) {
    if (!/^[a-f0-9]{40}$/.test(token)) throw new NotFoundException('Candidatura não encontrada.');
    const app = await this.prisma.application.findUnique({
      where: { trackingToken: token },
      include: { job: { select: { title: true, company: { select: { name: true } } } }, stage: { select: { name: true } }, events: { where: { type: { in: ['APPLIED', 'STAGE_CHANGED', 'REJECTED'] } }, orderBy: { createdAt: 'asc' }, select: { type: true, toStage: true, createdAt: true } } },
    });
    if (!app || app.anonymizedAt) throw new NotFoundException('Candidatura não encontrada.');
    return {
      job: app.job.title, company: app.job.company.name, appliedAt: app.createdAt, status: app.status, statusLabel: STAGE_LABEL_FOR_CANDIDATE[app.status] ?? app.status, stage: app.stage?.name ?? null,
      timeline: app.events.map((event) => ({ at: event.createdAt, label: event.type === 'APPLIED' ? 'Candidatura recebida' : event.type === 'REJECTED' ? 'Processo encerrado para esta vaga' : `Etapa: ${event.toStage ?? ''}` })),
      retentionUntil: app.retentionUntil,
    };
  }

  // ---------- pedidos do titular (LGPD art. 18) ----------
  /**
   * RS-C-01. Passo 1: NAO abre o pedido. Se o e-mail existe na base, envia um link de confirmacao (valido 2 h, uso unico, so o
   * hash fica gravado). Resposta sempre generica. Maximo de 3 confirmacoes por e-mail por hora.
   */
  async createRequest(dto: { email: string; type: string; message?: string }, ctx: { ip?: string } = {}) {
    const email = String(dto.email ?? '').trim().toLowerCase();
    const type = String(dto.type ?? '').toUpperCase() as RequestType;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !REQUEST_TYPES.includes(type)) return { received: true };
    const known = await this.prisma.candidate.findMany({ where: { email: { equals: email, mode: 'insensitive' } }, select: { companyId: true }, take: 1 });
    if (!known.length) return { received: true };
    const recent = await this.prisma.candidateRequestVerification.count({ where: { email, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
    if (recent >= 3) return { received: true };
    const token = randomBytes(32).toString('hex');
    await this.prisma.candidateRequestVerification.create({
      data: { email, type, message: dto.message?.trim().slice(0, 1500) || null, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS), ip: ctx.ip ?? null },
    });
    try {
      await this.mail.send(email, candidateRequestConfirmEmail({ type, confirmUrl: `${appBase()}/carreiras/privacidade/confirmar?token=${token}`, hours: 2 }));
    } catch (error) {
      this.logger.error(`Confirmacao de pedido LGPD nao enviada: ${error instanceof Error ? error.message : error}`);
    }
    return { received: true };
  }

  /** Passo 2: o titular provou que le o e-mail. Agora sim abre um pedido por empresa, com prazo de 15 dias (LGPD art. 19, II). */
  async confirmRequest(token: string) {
    const invalid = new BadRequestException('Link inválido ou expirado. Envie o pedido novamente.');
    if (!/^[a-f0-9]{64}$/.test(String(token ?? ''))) throw invalid;
    const row = await this.prisma.candidateRequestVerification.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) throw invalid;
    const claimed = await this.prisma.candidateRequestVerification.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    if (!claimed.count) throw invalid;
    const candidates = await this.prisma.candidate.findMany({ where: { email: { equals: row.email, mode: 'insensitive' } }, select: { companyId: true } });
    const confirmedAt = new Date();
    const dueAt = new Date(confirmedAt.getTime() + REQUEST_DEADLINE_DAYS * 86_400_000);
    for (const companyId of [...new Set(candidates.map((candidate) => candidate.companyId))]) {
      const open = await this.prisma.candidateRequest.count({ where: { companyId, email: row.email, type: row.type, status: 'OPEN' } });
      if (!open) await this.prisma.candidateRequest.create({ data: { companyId, email: row.email, type: row.type, message: row.message, confirmedAt, dueAt } });
    }
    return { confirmed: true, type: row.type, deadlineDays: REQUEST_DEADLINE_DAYS };
  }

  listRequests(companyId: string, status?: string) {
    return this.prisma.candidateRequest.findMany({ where: { companyId, ...(status ? { status } : {}) }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  /** Conjunto dos dados do titular nesta empresa (pedido de acesso). */
  async exportCandidateData(companyId: string, requestId: string) {
    const request = await this.requestOrFail(companyId, requestId);
    const candidates = await this.prisma.candidate.findMany({
      where: { companyId, email: { equals: request.email, mode: 'insensitive' } },
      include: { applications: { select: { createdAt: true, status: true, source: true, coverLetter: true, consentAt: true, consentVersion: true, rejectionReason: true, retentionUntil: true, job: { select: { title: true } }, answers: { select: { value: true, question: { select: { label: true } } } } } } },
    });
    return { generatedAt: new Date().toISOString(), email: request.email, candidates: candidates.map((c) => ({ name: c.name, phone: c.phone, linkedinUrl: c.linkedinUrl, applications: c.applications.map((a) => ({ vaga: a.job.title, data: a.createdAt, situacao: a.status, origem: a.source, consentimento: a.consentAt, versaoDaPolitica: a.consentVersion, guardadoAte: a.retentionUntil, respostas: a.answers.map((x) => ({ pergunta: x.question.label, resposta: x.value })) })) })) };
  }

  /** Exclusao exige decisao explicita do RH: perform=true executa; perform=false nega (com justificativa na resposta). Nunca por padrao. */
  async answerRequest(companyId: string, requestId: string, actorId: string, dto: { response: string; perform?: boolean }) {
    const request = await this.requestOrFail(companyId, requestId);
    if (request.status !== 'OPEN') return request;
    let decision: string | null = null;
    if (request.type === 'DELETION') {
      if (typeof dto.perform !== 'boolean') throw new BadRequestException('Informe a decisão sobre a exclusão: executar (perform=true) ou negar com justificativa (perform=false).');
      if (dto.perform) await this.anonymizeByEmail(companyId, request.email);
      decision = dto.perform ? 'EXECUTED' : 'DENIED';
      await this.prisma.auditLog.create({ data: { companyId, userId: actorId, action: dto.perform ? 'LGPD_DELETION_EXECUTED' : 'LGPD_DELETION_DENIED', entity: 'CandidateRequest', entityId: requestId, metadata: { type: request.type, confirmedAt: request.confirmedAt ?? null } } });
    }
    const updated = await this.prisma.candidateRequest.update({ where: { id: requestId }, data: { status: 'DONE', response: dto.response.trim().slice(0, 2000), resolvedAt: new Date(), resolvedBy: actorId, ...(decision ? { decision } : {}) } });
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
    await this.mail.send(request.email, candidateRequestAnsweredEmail({ company: company?.name ?? 'A empresa', type: request.type, response: dto.response.trim() }));
    return updated;
  }

  private async requestOrFail(companyId: string, id: string) {
    const request = await this.prisma.candidateRequest.findFirst({ where: { id, companyId } });
    if (!request) throw new NotFoundException('Pedido não encontrado.');
    return request;
  }

  // ---------- anonimização ----------
  async anonymizeByEmail(companyId: string, email: string) {
    const candidates = await this.prisma.candidate.findMany({ where: { companyId, email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    let total = 0;
    for (const { id } of candidates) total += await this.anonymizeCandidate(id);
    return total;
  }

  /** Remove dados pessoais e arquivos; mantém a candidatura (sem identificação) para as métricas. Contratados são preservados (viram funcionários). */
  async anonymizeCandidate(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId }, include: { applications: { select: { id: true, resumeUrl: true, status: true } } } });
    if (!candidate) return 0;
    const hired = candidate.status === 'HIRED' || candidate.applications.some((a) => a.status === 'HIRED');
    if (hired) return 0;
    for (const app of candidate.applications) if (app.resumeUrl) await this.storage.remove(app.resumeUrl);
    const docs = await this.prisma.recruitmentDocument.findMany({ where: { applicationId: { in: candidate.applications.map((a) => a.id) } }, select: { fileKey: true } });
    for (const doc of docs) await this.storage.remove(doc.fileKey);
    const ids = candidate.applications.map((a) => a.id);
    await this.prisma.$transaction([
      this.prisma.recruitmentDocument.deleteMany({ where: { applicationId: { in: ids } } }),
      this.prisma.applicationAnswer.deleteMany({ where: { applicationId: { in: ids } } }),
      this.prisma.applicationNote.deleteMany({ where: { applicationId: { in: ids } } }),
      this.prisma.application.updateMany({ where: { id: { in: ids } }, data: { coverLetter: null, linkedinUrl: null, resumeUrl: null, resumeName: null, resumeType: null, resumeSize: null, aiSummary: null, trackingToken: null, anonymizedAt: new Date() } }),
      this.prisma.candidate.update({ where: { id: candidateId }, data: { name: 'Candidato anonimizado', email: null, phone: null, linkedinUrl: null, coverLetter: null, resumeUrl: null, resumeName: null, resumeType: null, resumeSize: null, aiSummary: null, aiNotes: null, aiSkills: [] } }),
    ]);
    return 1;
  }

  /** Todo dia às 03:30 exclui os dados de quem passou do prazo de retenção da empresa. */
  @Cron('30 3 * * *')
  @CronLock('recruitment.retention', 3600)
  async purgeExpired() {
    const expired = await this.prisma.application.findMany({ where: { anonymizedAt: null, status: { not: 'HIRED' }, OR: [{ retentionUntil: { lte: new Date() } }, { retentionUntil: null, createdAt: { lte: monthsAgo(DEFAULT_RETENTION_MONTHS) } }] }, select: { candidateId: true }, distinct: ['candidateId'], take: 500 });
    let done = 0;
    for (const { candidateId } of expired) done += await this.anonymizeCandidate(candidateId);
    if (expired.length) this.logger.log(`Retenção LGPD: ${done} candidato(s) anonimizado(s).`);
    return done;
  }
}