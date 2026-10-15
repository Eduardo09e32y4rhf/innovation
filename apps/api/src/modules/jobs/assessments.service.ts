import { BadRequestException, GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { normalizeTechnicalQuestions, PROFILES, publicBehavioralItems, publicTechnicalQuestions, scoreBehavioral, scoreTechnical, type Profile, type TechnicalQuestion } from './assessment-rules';
import { formatInterviewDate } from './interview-rules';
import { RecruiterNotifierService } from './recruiter-notifier.service';
import { assessmentInviteEmail } from './recruitment-mails';
import { RecruitmentService } from './recruitment.service';
import { appBase, firstName, isPublicToken, newPublicToken } from './recruitment-tokens';

const GRACE_MS = 2 * 60_000;

/** Testes online: tecnico da vaga (gabarito e nota de corte) e comportamental (4 perfis). Enviados por link no e-mail. */
@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly recruitment: RecruitmentService,
    private readonly notifier: RecruiterNotifierService,
  ) {}

  private async assertJob(companyId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true, title: true } });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return job;
  }

  async getJobAssessment(companyId: string, jobId: string) {
    await this.assertJob(companyId, jobId);
    return this.prisma.jobAssessment.findFirst({ where: { jobId, companyId } });
  }

  async saveJobAssessment(companyId: string, jobId: string, dto: { title?: string; instructions?: string; timeLimitMinutes?: number | null; passingScore?: number; autoReject?: boolean; questions: unknown }) {
    const job = await this.assertJob(companyId, jobId);
    const questions = normalizeTechnicalQuestions(dto.questions);
    if (!questions.length) {
      await this.prisma.jobAssessment.deleteMany({ where: { jobId, companyId } });
      return null;
    }
    const passingScore = Math.round(Number(dto.passingScore ?? 60));
    if (!(passingScore >= 0 && passingScore <= 100)) throw new BadRequestException('Nota de corte de 0 a 100.');
    const limit = dto.timeLimitMinutes === null || dto.timeLimitMinutes === undefined || (dto.timeLimitMinutes as unknown) === '' ? null : Math.round(Number(dto.timeLimitMinutes));
    if (limit !== null && !(limit >= 5 && limit <= 240)) throw new BadRequestException('Tempo de 5 a 240 minutos (ou sem limite).');
    const data = {
      title: String(dto.title ?? '').trim().slice(0, 160) || `Teste: ${job.title}`,
      instructions: String(dto.instructions ?? '').trim().slice(0, 3000) || null,
      timeLimitMinutes: limit, passingScore, autoReject: Boolean(dto.autoReject), questions: questions as unknown as object,
    };
    return this.prisma.jobAssessment.upsert({ where: { jobId }, create: { ...data, jobId, companyId }, update: data });
  }

  async send(companyId: string, userId: string, applicationId: string, dto: { kind: 'TECHNICAL' | 'BEHAVIORAL'; validDays?: number }) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, include: { candidate: { select: { name: true, email: true } }, job: { select: { id: true, title: true, company: { select: { name: true } } } } } });
    if (!app) throw new NotFoundException('Candidatura não encontrada.');
    if (['REJECTED', 'HIRED'].includes(app.status)) throw new BadRequestException('Este candidato não está mais no processo.');
    if (!app.candidate.email) throw new BadRequestException('O candidato não tem e-mail.');
    const assessment = dto.kind === 'TECHNICAL' ? await this.prisma.jobAssessment.findFirst({ where: { jobId: app.job.id, companyId } }) : null;
    if (dto.kind === 'TECHNICAL' && !assessment) throw new BadRequestException('Esta vaga ainda não tem teste técnico. Crie em Editar vaga > Teste.');
    const pending = await this.prisma.assessmentInvite.findFirst({ where: { companyId, applicationId, kind: dto.kind, status: { in: ['SENT', 'STARTED'] }, expiresAt: { gt: new Date() } } });
    if (pending) throw new BadRequestException('Já existe um teste deste tipo aguardando resposta. Cancele antes de enviar outro.');
    const days = Math.min(Math.max(Math.round(dto.validDays ?? 3), 1), 14);
    const invite = await this.prisma.assessmentInvite.create({ data: { companyId, applicationId, kind: dto.kind, assessmentId: assessment?.id ?? null, token: newPublicToken(), expiresAt: new Date(Date.now() + days * 86_400_000), createdById: userId } });
    const result = await this.mail.send(app.candidate.email, assessmentInviteEmail({
      name: app.candidate.name, company: app.job.company.name, jobTitle: app.job.title, kind: dto.kind, title: assessment?.title ?? 'Questionário comportamental',
      url: `${appBase()}/carreiras/teste/${invite.token}`, expires: formatInterviewDate(invite.expiresAt).long, minutes: assessment?.timeLimitMinutes,
    }));
    await this.prisma.applicationEvent.create({ data: { applicationId, userId, type: 'ASSESSMENT_SENT', note: `${dto.kind === 'TECHNICAL' ? 'Teste técnico' : 'Questionário comportamental'} enviado${result.sent ? '' : ' (e-mail não saiu)'}` } });
    return { id: invite.id, emailed: result.sent };
  }

  async list(companyId: string, applicationId: string) {
    const rows = await this.prisma.assessmentInvite.findMany({ where: { companyId, applicationId }, orderBy: { createdAt: 'desc' }, take: 20 });
    const assessments = await this.prisma.jobAssessment.findMany({ where: { id: { in: rows.map((row) => row.assessmentId).filter(Boolean) as string[] } }, select: { id: true, title: true, passingScore: true } });
    const byId = new Map(assessments.map((item) => [item.id, item]));
    return rows.map(({ token: _token, answers: _answers, ...row }) => ({
      ...row,
      status: ['SENT', 'STARTED'].includes(row.status) && row.expiresAt.getTime() < Date.now() ? 'EXPIRED' : row.status,
      title: row.kind === 'BEHAVIORAL' ? 'Questionário comportamental' : byId.get(row.assessmentId ?? '')?.title ?? 'Teste técnico',
      passingScore: byId.get(row.assessmentId ?? '')?.passingScore ?? null,
      profiles: row.kind === 'BEHAVIORAL' ? PROFILES : undefined,
    }));
  }

  async cancel(companyId: string, applicationId: string, inviteId: string) {
    const result = await this.prisma.assessmentInvite.updateMany({ where: { id: inviteId, companyId, applicationId, status: { in: ['SENT', 'STARTED'] } }, data: { status: 'CANCELED' } });
    return { canceled: result.count > 0 };
  }

  // ---------- pagina publica ----------
  private async byToken(token: string) {
    if (!isPublicToken(token)) throw new NotFoundException('Teste não encontrado.');
    const invite = await this.prisma.assessmentInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Teste não encontrado.');
    const app = await this.prisma.application.findFirst({ where: { id: invite.applicationId, companyId: invite.companyId }, select: { id: true, status: true, anonymizedAt: true, jobId: true, candidate: { select: { name: true } }, job: { select: { title: true, company: { select: { name: true } } } } } });
    if (!app || app.anonymizedAt) throw new NotFoundException('Teste não encontrado.');
    const assessment = invite.assessmentId ? await this.prisma.jobAssessment.findUnique({ where: { id: invite.assessmentId } }) : null;
    return { invite, app, assessment };
  }

  private status(invite: { status: string; expiresAt: Date }) {
    return ['SENT', 'STARTED'].includes(invite.status) && invite.expiresAt.getTime() < Date.now() ? 'EXPIRED' : invite.status;
  }

  private deadline(invite: { startedAt: Date | null }, assessment: { timeLimitMinutes: number | null } | null) {
    return invite.startedAt && assessment?.timeLimitMinutes ? new Date(invite.startedAt.getTime() + assessment.timeLimitMinutes * 60_000) : null;
  }

  async publicAssessment(token: string) {
    const { invite, app, assessment } = await this.byToken(token);
    const status = this.status(invite);
    const started = invite.status === 'STARTED';
    const technical = invite.kind === 'TECHNICAL';
    return {
      candidate: firstName(app.candidate.name), company: app.job.company.name, job: app.job.title, kind: invite.kind, status,
      title: technical ? assessment?.title ?? 'Teste técnico' : 'Questionário comportamental',
      instructions: technical ? assessment?.instructions ?? null : 'São 16 situações. Em cada uma, escolha a frase que MAIS parece com você no trabalho. Não existe resposta certa ou errada.',
      timeLimitMinutes: technical ? assessment?.timeLimitMinutes ?? null : null,
      questionCount: technical ? ((assessment?.questions as unknown as TechnicalQuestion[]) ?? []).length : 16,
      expiresAt: invite.expiresAt,
      deadline: this.deadline(invite, assessment),
      // As perguntas so aparecem depois de "Comecar" (o tempo conta a partir dali).
      questions: started && status === 'STARTED' ? (technical ? publicTechnicalQuestions((assessment?.questions as unknown as TechnicalQuestion[]) ?? []) : publicBehavioralItems()) : null,
    };
  }

  async start(token: string) {
    const { invite } = await this.byToken(token);
    const status = this.status(invite);
    if (status === 'SENT') await this.prisma.assessmentInvite.updateMany({ where: { id: invite.id, status: 'SENT' }, data: { status: 'STARTED', startedAt: new Date() } });
    else if (status !== 'STARTED') throw new GoneException(status === 'COMPLETED' ? 'Você já respondeu este teste.' : 'Este link não está mais disponível.');
    return this.publicAssessment(token);
  }

  async submit(token: string, answers: Record<string, unknown>) {
    const { invite, app, assessment } = await this.byToken(token);
    if (this.status(invite) !== 'STARTED') throw new GoneException(invite.status === 'COMPLETED' ? 'Você já respondeu este teste.' : 'Este link não está mais disponível.');
    const safe = Object.fromEntries(Object.entries(answers ?? {}).slice(0, 100).map(([key, value]) => [String(key).slice(0, 60), typeof value === 'number' ? value : Number(value)]));
    const deadline = this.deadline(invite, assessment);
    const late = Boolean(deadline && Date.now() > deadline.getTime() + GRACE_MS);
    let score: number | null = null;
    let passed: boolean | null = null;
    let result: Record<string, unknown>;
    if (invite.kind === 'TECHNICAL') {
      const questions = (assessment?.questions as unknown as TechnicalQuestion[]) ?? [];
      const graded = scoreTechnical(questions, safe);
      score = graded.score;
      passed = !late && graded.score >= (assessment?.passingScore ?? 60);
      result = { ...graded, passingScore: assessment?.passingScore ?? 60, late };
    } else {
      const profile = scoreBehavioral(safe);
      result = { ...profile, dominantLabel: PROFILES[profile.dominant as Profile].label, secondaryLabel: profile.secondary ? PROFILES[profile.secondary as Profile].label : null };
    }
    const claimed = await this.prisma.assessmentInvite.updateMany({ where: { id: invite.id, status: 'STARTED' }, data: { status: 'COMPLETED', completedAt: new Date(), score, passed, result: result as object, answers: safe as object } });
    if (!claimed.count) throw new GoneException('Você já respondeu este teste.');
    const note = invite.kind === 'TECHNICAL'
      ? `Teste técnico respondido: nota ${score}${passed ? ' (aprovado)' : ` (abaixo da nota de corte${late ? ', fora do tempo' : ''})`}`
      : `Questionário comportamental respondido: perfil ${result.dominantLabel}${result.secondaryLabel ? ` com traços de ${result.secondaryLabel}` : ''}`;
    await this.prisma.applicationEvent.create({ data: { applicationId: invite.applicationId, type: 'ASSESSMENT_COMPLETED', note } });
    if (invite.kind === 'TECHNICAL' && passed === false && assessment?.autoReject) await this.autoReject(invite.companyId, invite.applicationId, score ?? 0, assessment.passingScore);
    await this.notifier.notify({ companyId: invite.companyId, jobId: app.jobId, userIds: [invite.createdById], title: `${app.candidate.name} respondeu o ${invite.kind === 'TECHNICAL' ? 'teste técnico' : 'questionário'}`, lines: [note + '.'], priority: 'LOW', roles: [], kind: 'ASSESSMENT_COMPLETED', cta: 'Ver resultado' });
    return { done: true, kind: invite.kind };
  }

  private async autoReject(companyId: string, applicationId: string, score: number, passingScore: number) {
    try {
      const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { status: true, stage: { select: { pipelineId: true } }, job: { select: { pipelineId: true } } } });
      if (!app || ['REJECTED', 'HIRED'].includes(app.status)) return;
      const pipelineId = app.stage?.pipelineId ?? app.job.pipelineId ?? (await this.prisma.hiringPipeline.findFirst({ where: { companyId, isDefault: true }, select: { id: true } }))?.id;
      const stage = pipelineId ? await this.prisma.pipelineStage.findFirst({ where: { pipelineId, kind: 'REJECTED' }, orderBy: { position: 'asc' } }) : null;
      if (stage) await this.recruitment.moveApplication(companyId, null, applicationId, { stageId: stage.id, rejectionCode: 'PERFIL', rejectionReason: `Nota ${score} no teste técnico (mínimo ${passingScore})` });
    } catch (error) {
      this.logger.warn(`Reprovação automática pelo teste falhou (${applicationId}): ${error instanceof Error ? error.message : error}`);
    }
  }
}
