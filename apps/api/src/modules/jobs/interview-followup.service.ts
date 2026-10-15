import { BadRequestException, GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { formatInterviewDate, interviewerLabel, meetingProvider, normalizeInterview } from './interview-rules';
import { RecruiterNotifierService } from './recruiter-notifier.service';
import { interviewSlotsEmail } from './recruitment-mails';
import { RecruitmentPrivacyService } from './recruitment-privacy.service';
import { RecruitmentService } from './recruitment.service';
import { appBase, firstName, isPublicToken, newPublicToken } from './recruitment-tokens';

export const RECOMMENDATIONS = ['STRONG_YES', 'YES', 'NO', 'STRONG_NO'] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

const HOUR = 3_600_000;

/** Horarios do autoagendamento: futuros, sem repeticao, ordenados, de 1 a 8. */
export function normalizeSlots(raw: unknown, now = new Date()): Date[] {
  if (!Array.isArray(raw)) throw new BadRequestException('Ofereça ao menos um horário.');
  const dates = raw.map((value) => new Date(String(value))).filter((date) => !Number.isNaN(date.getTime()));
  const unique = [...new Map(dates.map((date) => [date.getTime(), date])).values()].sort((a, b) => a.getTime() - b.getTime());
  if (!unique.length) throw new BadRequestException('Ofereça ao menos um horário.');
  if (unique.length > 8) throw new BadRequestException('Ofereça no máximo 8 horários.');
  if (unique.some((date) => date.getTime() < now.getTime() + HOUR)) throw new BadRequestException('Os horários precisam ser daqui a pelo menos 1 hora.');
  return unique;
}

/** Media das notas (1 a 5) de uma avaliacao, ou null. */
export function averageRating(ratings: { score: number }[]): number | null {
  const valid = ratings.filter((item) => Number.isFinite(item.score) && item.score >= 1 && item.score <= 5);
  if (!valid.length) return null;
  return Math.round((valid.reduce((sum, item) => sum + item.score, 0) / valid.length) * 10) / 10;
}

/**
 * Depois do convite: confirmacao de presenca, lembrete da vespera, autoagendamento, roteiro e avaliacao por
 * entrevistador. Tudo por e-mail e pelas paginas do proprio portal (sem WhatsApp nem servico pago).
 */
@Injectable()
export class InterviewFollowupService {
  private readonly logger = new Logger(InterviewFollowupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly privacy: RecruitmentPrivacyService,
    private readonly recruitment: RecruitmentService,
    private readonly notifier: RecruiterNotifierService,
  ) {}

  // ---------- confirmacao de presenca (pagina publica) ----------
  private async interviewByToken(token: string) {
    if (!isPublicToken(token)) throw new NotFoundException('Convite não encontrado.');
    const interview = await this.prisma.applicationInterview.findUnique({
      where: { responseToken: token },
      include: { application: { select: { id: true, companyId: true, jobId: true, status: true, anonymizedAt: true, candidate: { select: { name: true } }, job: { select: { title: true, company: { select: { name: true, logoUrl: true } } } } } } },
    });
    if (!interview || interview.application.anonymizedAt) throw new NotFoundException('Convite não encontrado.');
    return interview;
  }

  async publicInterview(token: string) {
    const interview = await this.interviewByToken(token);
    const closed = ['REJECTED', 'HIRED'].includes(interview.application.status);
    const past = interview.scheduledAt.getTime() < Date.now();
    return {
      candidate: firstName(interview.application.candidate.name),
      company: interview.application.job.company.name,
      logoUrl: interview.application.job.company.logoUrl,
      job: interview.application.job.title,
      scheduledAt: interview.scheduledAt,
      when: formatInterviewDate(interview.scheduledAt).long,
      durationMinutes: interview.durationMinutes ?? 60,
      mode: interview.mode,
      location: interview.location,
      meetingUrl: interview.meetingUrl,
      meetingProvider: interview.meetingUrl ? meetingProvider(interview.meetingUrl) : null,
      interviewer: interviewerLabel(interview.interviewerRole, interview.interviewer),
      message: interview.candidateMessage,
      response: interview.candidateResponse,
      respondedAt: interview.respondedAt,
      canRespond: !closed && !past,
    };
  }

  async respond(token: string, input: { response: 'CONFIRMED' | 'DECLINED'; reason?: string }) {
    const interview = await this.interviewByToken(token);
    if (['REJECTED', 'HIRED'].includes(interview.application.status)) throw new GoneException('Este processo seletivo já foi encerrado.');
    if (interview.scheduledAt.getTime() < Date.now()) throw new GoneException('O horário desta entrevista já passou.');
    const reason = String(input.reason ?? '').trim().slice(0, 500) || null;
    if (interview.candidateResponse === input.response && (input.response === 'CONFIRMED' || interview.declineReason === reason)) return this.publicInterview(token);
    await this.prisma.applicationInterview.update({ where: { id: interview.id }, data: { candidateResponse: input.response, respondedAt: new Date(), declineReason: input.response === 'DECLINED' ? reason : null } });
    const when = formatInterviewDate(interview.scheduledAt).short;
    const name = interview.application.candidate.name;
    await this.prisma.applicationEvent.create({
      data: { applicationId: interview.applicationId, type: input.response === 'CONFIRMED' ? 'INTERVIEW_CONFIRMED' : 'INTERVIEW_DECLINED', note: input.response === 'CONFIRMED' ? `Candidato confirmou a entrevista de ${when}` : `Candidato avisou que não pode na entrevista de ${when}${reason ? `: ${reason}` : ''}` },
    });
    if (interview.agendaEventId) {
      const event = await this.prisma.managementEvent.findFirst({ where: { id: interview.agendaEventId, companyId: interview.application.companyId }, select: { title: true } });
      if (event) {
        const clean = event.title.replace(/^(Confirmada|Não confirmada|Candidato não pode): /, '');
        await this.prisma.managementEvent.update({ where: { id: interview.agendaEventId }, data: { title: `${input.response === 'CONFIRMED' ? 'Confirmada' : 'Candidato não pode'}: ${clean}`.slice(0, 200) } });
      }
    }
    await this.notifier.notify({
      companyId: interview.application.companyId,
      jobId: interview.application.jobId,
      userIds: [interview.createdById],
      title: input.response === 'CONFIRMED' ? `${name} confirmou a entrevista (${when})` : `${name} não pode na entrevista de ${when}`,
      lines: input.response === 'CONFIRMED'
        ? [`${name} confirmou presença na entrevista da vaga ${interview.application.job.title}, ${formatInterviewDate(interview.scheduledAt).long}.`]
        : [`${name} avisou que não vai conseguir ir à entrevista da vaga ${interview.application.job.title} (${when}).`, reason ? `Motivo: ${reason}` : 'Sem motivo informado.', 'Remarque pela ficha do candidato: ofereça novos horários para ele escolher.'],
      priority: input.response === 'DECLINED' ? 'HIGH' : 'LOW',
      kind: input.response === 'CONFIRMED' ? 'INTERVIEW_CONFIRMED' : 'INTERVIEW_DECLINED',
      cta: 'Abrir a vaga',
    });
    return this.publicInterview(token);
  }

  // ---------- lembrete da vespera + feedback de reprovacao automatica ----------
  @Cron('10 * * * *')
  @CronLock('recruitment.interview-reminders', 1800)
  async hourly() {
    await this.sendReminders();
    await this.sendDelayedKnockoutFeedback();
  }

  /** Entrevista nas proximas 24h, convidado ha mais de 2h, sem lembrete e sem recusa: manda o lembrete. */
  async sendReminders(now = new Date()) {
    const due = await this.prisma.applicationInterview.findMany({
      where: {
        mode: { not: null }, notifiedAt: { not: null, lte: new Date(now.getTime() - 2 * HOUR) }, reminderSentAt: null,
        OR: [{ candidateResponse: null }, { candidateResponse: 'CONFIRMED' }],
        scheduledAt: { gte: new Date(now.getTime() + HOUR), lte: new Date(now.getTime() + 24 * HOUR) },
        application: { status: { notIn: ['REJECTED', 'HIRED'] }, anonymizedAt: null },
      },
      take: 200,
    });
    let sent = 0;
    for (const interview of due) {
      // Marca antes de enviar: dois servidores nunca mandam o mesmo lembrete.
      const claimed = await this.prisma.applicationInterview.updateMany({ where: { id: interview.id, reminderSentAt: null }, data: { reminderSentAt: now } });
      if (!claimed.count) continue;
      if (await this.privacy.sendInterviewEmail(interview.applicationId, interview, 'REMINDER')) sent += 1;
    }
    if (due.length) this.logger.log(`Lembretes de entrevista: ${sent}/${due.length} enviados.`);
    return sent;
  }

  /**
   * Reprovado automaticamente por pergunta eliminatoria: o retorno sai 24h depois (receber "nao seguiremos" segundos
   * depois de se candidatar passa a impressao de robo). Antes o e-mail saia na hora.
   */
  async sendDelayedKnockoutFeedback(now = new Date()) {
    const pending = await this.prisma.application.findMany({
      where: { status: 'REJECTED', knockedOut: true, anonymizedAt: null, createdAt: { lte: new Date(now.getTime() - 24 * HOUR), gte: new Date(now.getTime() - 7 * 24 * HOUR) }, events: { none: { type: 'REJECTION_EMAIL_SENT' } } },
      select: { id: true },
      take: 200,
    });
    for (const app of pending) await this.privacy.afterRejected(app.id);
    return pending.length;
  }

  // ---------- autoagendamento ----------
  async createSlotOffer(companyId: string, userId: string, applicationId: string, dto: {
    slots: string[]; mode: string; location?: string; meetingUrl?: string; durationMinutes?: number; interviewerRole?: string; interviewer?: string; candidateMessage?: string; validDays?: number;
  }) {
    const slots = normalizeSlots(dto.slots);
    // Mesmas regras da entrevista (presencial exige local, online exige link https), validadas no primeiro horario.
    const base = normalizeInterview({ scheduledAt: slots[0].toISOString(), mode: dto.mode, location: dto.location, meetingUrl: dto.meetingUrl, durationMinutes: dto.durationMinutes, interviewerRole: dto.interviewerRole, interviewer: dto.interviewer, candidateMessage: dto.candidateMessage });
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, include: { candidate: { select: { name: true, email: true } }, job: { select: { id: true, title: true, company: { select: { name: true } } } } } });
    if (!app) throw new NotFoundException('Candidatura não encontrada.');
    if (['REJECTED', 'HIRED'].includes(app.status)) throw new BadRequestException('Este candidato não está mais no processo.');
    if (!app.candidate.email) throw new BadRequestException('O candidato não tem e-mail para receber os horários.');
    const days = Math.min(Math.max(Math.round(dto.validDays ?? 3), 1), 14);
    const expiresAt = new Date(Math.min(Date.now() + days * 24 * HOUR, slots[slots.length - 1].getTime()));
    await this.prisma.interviewSlotOffer.updateMany({ where: { companyId, applicationId, status: 'PENDING' }, data: { status: 'CANCELED' } });
    const offer = await this.prisma.interviewSlotOffer.create({
      data: {
        companyId, applicationId, token: newPublicToken(), slots: slots.map((date) => date.toISOString()), mode: base.mode!, location: base.location, meetingUrl: base.meetingUrl,
        durationMinutes: base.durationMinutes, interviewerRole: base.interviewerRole, interviewer: base.interviewer, candidateMessage: base.candidateMessage, expiresAt, createdById: userId,
      },
    });
    const url = `${appBase()}/carreiras/agendar/${offer.token}`;
    const result = await this.mail.send(app.candidate.email, interviewSlotsEmail({
      name: app.candidate.name, company: app.job.company.name, jobTitle: app.job.title, mode: base.mode!, durationMinutes: base.durationMinutes,
      slots: slots.map((date) => formatInterviewDate(date).long), url, expires: formatInterviewDate(expiresAt).long, message: base.candidateMessage,
    }));
    await this.prisma.applicationEvent.create({ data: { applicationId, userId, type: 'INTERVIEW_SLOTS_SENT', note: `${slots.length} horário(s) oferecido(s) para o candidato escolher${result.sent ? '' : ' (e-mail não saiu)'}` } });
    return { ...offer, emailed: result.sent };
  }

  async cancelSlotOffer(companyId: string, applicationId: string, offerId: string) {
    const result = await this.prisma.interviewSlotOffer.updateMany({ where: { id: offerId, companyId, applicationId, status: 'PENDING' }, data: { status: 'CANCELED' } });
    return { canceled: result.count > 0 };
  }

  listSlotOffers(companyId: string, applicationId: string) {
    return this.prisma.interviewSlotOffer.findMany({ where: { companyId, applicationId }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, slots: true, mode: true, status: true, expiresAt: true, bookedAt: true, interviewId: true, createdAt: true } });
  }

  private async slotOfferByToken(token: string) {
    if (!isPublicToken(token)) throw new NotFoundException('Link não encontrado.');
    const offer = await this.prisma.interviewSlotOffer.findUnique({ where: { token } });
    if (!offer) throw new NotFoundException('Link não encontrado.');
    const app = await this.prisma.application.findFirst({ where: { id: offer.applicationId, companyId: offer.companyId }, select: { id: true, status: true, anonymizedAt: true, jobId: true, candidate: { select: { name: true } }, job: { select: { title: true, company: { select: { name: true, logoUrl: true } } } } } });
    if (!app || app.anonymizedAt) throw new NotFoundException('Link não encontrado.');
    return { offer, app };
  }

  /** Horarios ainda livres: futuros (com 1h de folga) e que nao batem com outra entrevista ja marcada por quem ofereceu. */
  private async freeSlots(offer: { slots: Prisma.JsonValue; durationMinutes: number; createdById: string | null; companyId: string }) {
    const slots = (Array.isArray(offer.slots) ? offer.slots : []).map((value) => new Date(String(value))).filter((date) => date.getTime() > Date.now() + HOUR);
    if (!offer.createdById || !slots.length) return slots;
    const busy = await this.prisma.managementEvent.findMany({
      where: { companyId: offer.companyId, responsibleUserId: offer.createdById, status: { notIn: ['CANCELADO', 'CONCLUIDO'] }, startDateTime: { lt: new Date(slots[slots.length - 1].getTime() + offer.durationMinutes * 60_000) }, OR: [{ endDateTime: { gt: slots[0] } }, { endDateTime: null, startDateTime: { gte: slots[0] } }] },
      select: { startDateTime: true, endDateTime: true },
    });
    return slots.filter((slot) => {
      const end = slot.getTime() + offer.durationMinutes * 60_000;
      return !busy.some((event) => {
        const start = event.startDateTime.getTime();
        const stop = event.endDateTime ? event.endDateTime.getTime() : start + 60 * 60_000;
        return start < end && stop > slot.getTime();
      });
    });
  }

  async publicSlotOffer(token: string) {
    const { offer, app } = await this.slotOfferByToken(token);
    const expired = offer.status === 'PENDING' && offer.expiresAt.getTime() < Date.now();
    const status = expired ? 'EXPIRED' : ['REJECTED', 'HIRED'].includes(app.status) && offer.status === 'PENDING' ? 'CANCELED' : offer.status;
    const slots = status === 'PENDING' ? await this.freeSlots(offer) : [];
    const booked = offer.interviewId ? await this.prisma.applicationInterview.findUnique({ where: { id: offer.interviewId }, select: { scheduledAt: true, responseToken: true } }) : null;
    return {
      candidate: firstName(app.candidate.name), company: app.job.company.name, logoUrl: app.job.company.logoUrl, job: app.job.title,
      mode: offer.mode, durationMinutes: offer.durationMinutes, location: offer.mode === 'PRESENCIAL' ? offer.location : null,
      interviewer: interviewerLabel(offer.interviewerRole, offer.interviewer), message: offer.candidateMessage,
      status, expiresAt: offer.expiresAt,
      slots: slots.map((date) => ({ value: date.toISOString(), label: formatInterviewDate(date).long })),
      booked: booked ? { when: formatInterviewDate(booked.scheduledAt).long, responseToken: booked.responseToken } : null,
    };
  }

  async bookSlot(token: string, slotValue: string) {
    const { offer, app } = await this.slotOfferByToken(token);
    if (offer.status !== 'PENDING' || offer.expiresAt.getTime() < Date.now() || ['REJECTED', 'HIRED'].includes(app.status)) throw new GoneException('Estes horários não estão mais disponíveis. Fale com a empresa.');
    const chosen = new Date(String(slotValue));
    const free = await this.freeSlots(offer);
    if (Number.isNaN(chosen.getTime()) || !free.some((slot) => slot.getTime() === chosen.getTime())) throw new BadRequestException('Este horário não está mais livre. Escolha outro.');
    // Reserva atomica: so um clique vence (duas abas, clique duplo).
    const claimed = await this.prisma.interviewSlotOffer.updateMany({ where: { id: offer.id, status: 'PENDING' }, data: { status: 'BOOKED', bookedAt: new Date() } });
    if (!claimed.count) throw new GoneException('Estes horários não estão mais disponíveis.');
    try {
      const interview = await this.recruitment.addInterview(offer.companyId, offer.createdById, offer.applicationId, {
        scheduledAt: chosen.toISOString(), mode: offer.mode as 'PRESENCIAL' | 'ONLINE', location: offer.location ?? undefined, meetingUrl: offer.meetingUrl ?? undefined,
        durationMinutes: offer.durationMinutes, interviewerRole: (offer.interviewerRole as 'RH' | 'GESTOR' | null) ?? undefined, interviewer: offer.interviewer ?? undefined,
        candidateMessage: offer.candidateMessage ?? undefined, notifyCandidate: true,
      });
      // Escolheu pelo link: ja vale como presenca confirmada.
      await this.prisma.applicationInterview.update({ where: { id: interview.id }, data: { candidateResponse: 'CONFIRMED', respondedAt: new Date() } });
      await this.prisma.interviewSlotOffer.update({ where: { id: offer.id }, data: { interviewId: interview.id } });
      await this.moveToInterviewStage(offer.companyId, offer.applicationId);
      const when = formatInterviewDate(chosen).long;
      await this.notifier.notify({
        companyId: offer.companyId, jobId: app.jobId, userIds: [offer.createdById],
        title: `${app.candidate.name} escolheu o horário da entrevista`,
        lines: [`${app.candidate.name} marcou a entrevista da vaga ${app.job.title} para ${when}.`, 'O convite com os detalhes já foi enviado ao candidato e a entrevista está na sua Agenda.'],
        kind: 'INTERVIEW_SLOT_BOOKED', cta: 'Abrir a vaga',
      });
      return this.publicSlotOffer(token);
    } catch (error) {
      await this.prisma.interviewSlotOffer.update({ where: { id: offer.id }, data: { status: 'PENDING', bookedAt: null } });
      throw error;
    }
  }

  /** Quem escolheu horario vai para a etapa de entrevista (se ainda estava antes dela). */
  private async moveToInterviewStage(companyId: string, applicationId: string) {
    try {
      const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { status: true, stage: { select: { pipelineId: true } }, job: { select: { pipelineId: true } } } });
      if (!app || !['APPLIED', 'SCREENING'].includes(app.status)) return;
      const pipelineId = app.stage?.pipelineId ?? app.job.pipelineId ?? (await this.prisma.hiringPipeline.findFirst({ where: { companyId, isDefault: true }, select: { id: true } }))?.id;
      const stage = pipelineId ? await this.prisma.pipelineStage.findFirst({ where: { pipelineId, kind: 'INTERVIEW' }, orderBy: { position: 'asc' } }) : null;
      if (stage) await this.recruitment.moveApplication(companyId, null, applicationId, { stageId: stage.id, note: 'Candidato escolheu o horário da entrevista' });
    } catch (error) {
      this.logger.warn(`Nao moveu para entrevista (${applicationId}): ${error instanceof Error ? error.message : error}`);
    }
  }

  // ---------- avaliacao por entrevistador ----------
  async saveFeedback(companyId: string, userId: string, applicationId: string, interviewId: string, dto: { ratings: { criterionId: string; score: number }[]; recommendation: string; notes?: string }) {
    const interview = await this.prisma.applicationInterview.findFirst({ where: { id: interviewId, applicationId, application: { companyId } }, select: { id: true, application: { select: { jobId: true } } } });
    if (!interview) throw new NotFoundException('Entrevista não encontrada.');
    if (!RECOMMENDATIONS.includes(dto.recommendation as Recommendation)) throw new BadRequestException('Escolha sua recomendação.');
    const criteria = await this.prisma.jobCriterion.findMany({ where: { jobId: interview.application.jobId }, select: { id: true, name: true } });
    const byId = new Map(criteria.map((item) => [item.id, item.name]));
    const ratings = (dto.ratings ?? []).filter((item) => byId.has(item.criterionId)).map((item) => {
      const score = Math.round(Number(item.score));
      if (!(score >= 1 && score <= 5)) throw new BadRequestException('Notas de 1 a 5.');
      return { criterionId: item.criterionId, name: byId.get(item.criterionId)!, score };
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    const notes = String(dto.notes ?? '').trim().slice(0, 4000) || null;
    const saved = await this.prisma.interviewFeedback.upsert({
      where: { interviewId_userId: { interviewId, userId } },
      create: { interviewId, applicationId, userId, authorName: user?.name || user?.email || null, ratings, recommendation: dto.recommendation, notes },
      update: { ratings, recommendation: dto.recommendation, notes, authorName: user?.name || user?.email || null },
    });
    await this.prisma.applicationEvent.create({ data: { applicationId, userId, type: 'INTERVIEW_FEEDBACK', note: `Avaliação da entrevista: ${RECOMMENDATION_LABEL[dto.recommendation as Recommendation]}${averageRating(ratings) ? ` (média ${averageRating(ratings)})` : ''}` } });
    return saved;
  }

  /**
   * Avaliacoes da entrevista. Quem ainda nao avaliou ve so a propria (avaliacao "as cegas", sem ser influenciado
   * pelos outros); depois de avaliar, ve todas.
   */
  async listFeedback(companyId: string, userId: string, applicationId: string) {
    const rows = await this.prisma.interviewFeedback.findMany({ where: { applicationId, interview: { application: { companyId } } }, orderBy: { createdAt: 'asc' } });
    const mine = new Set(rows.filter((row) => row.userId === userId).map((row) => row.interviewId));
    const visible = rows.filter((row) => row.userId === userId || mine.has(row.interviewId));
    return {
      items: visible.map((row) => ({ ...row, average: averageRating((row.ratings as { score: number }[]) ?? []) })),
      hidden: rows.length - visible.length,
    };
  }
}

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = { STRONG_YES: 'Contrataria com certeza', YES: 'Contrataria', NO: 'Não contrataria', STRONG_NO: 'Não contrataria de jeito nenhum' };
