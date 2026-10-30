import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { AssessmentsService } from './assessments.service';
import { candidateStageChangedEmail } from './recruitment-mails';
import { issueTrackingToken } from './recruitment-access-tokens';

export type WorkflowOutcome = { status: 'COMPLETED' | 'WAITING' | 'FAILED'; action: string; emailed?: boolean; requiredAction?: 'SCHEDULE_INTERVIEW' | 'PREPARE_OFFER' | 'REQUEST_DOCUMENTS' | 'COMPLETE_ADMISSION'; message?: string };

@Injectable()
export class RecruitmentWorkflowService {
  private readonly logger = new Logger(RecruitmentWorkflowService.name);
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService, @Inject(forwardRef(() => AssessmentsService)) private readonly assessments: AssessmentsService) {}

  async execute(runId: string): Promise<WorkflowOutcome> {
    const run = await this.prisma.recruitmentWorkflowRun.findUnique({ where: { id: runId } });
    if (!run) return { status: 'FAILED', action: 'NONE', message: 'Automação não encontrada.' };
    if (['COMPLETED', 'WAITING'].includes(run.status) && run.result) return run.result as WorkflowOutcome;
    const claimed = await this.prisma.recruitmentWorkflowRun.updateMany({ where: { id: run.id, status: { in: ['PENDING', 'FAILED'] } }, data: { status: 'RUNNING', attempts: { increment: 1 }, error: null } });
    if (!claimed.count) return { status: 'WAITING', action: run.action, message: 'A automação já está sendo processada.' };
    try {
      const outcome = await this.perform(run.applicationId, run.action);
      await this.prisma.recruitmentWorkflowRun.update({ where: { id: run.id }, data: { status: outcome.status, result: outcome as object, error: null } });
      await this.prisma.applicationEvent.create({ data: { applicationId: run.applicationId, type: 'WORKFLOW_EXECUTED', note: outcome.message ?? `${run.action}: ${outcome.status}` } });
      return outcome;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha na automação da etapa.';
      this.logger.error(`Workflow ${run.id} (${run.action}) falhou: ${message}`);
      const outcome: WorkflowOutcome = { status: 'FAILED', action: run.action, message };
      await this.prisma.recruitmentWorkflowRun.update({ where: { id: run.id }, data: { status: 'FAILED', error: message, result: outcome as object } });
      await this.prisma.applicationEvent.create({ data: { applicationId: run.applicationId, type: 'WORKFLOW_FAILED', note: `${run.action}: ${message}` } });
      return outcome;
    }
  }

  @Cron('*/5 * * * *')
  @CronLock('recruitment.workflow-retry', 240)
  async retryPending() {
    await this.prisma.recruitmentWorkflowRun.updateMany({ where: { status: 'RUNNING', updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } }, data: { status: 'FAILED', error: 'Execução interrompida; reagendada automaticamente.' } });
    const runs = await this.prisma.recruitmentWorkflowRun.findMany({ where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: 5 } }, orderBy: { createdAt: 'asc' }, take: 50, select: { id: true } });
    for (const run of runs) await this.execute(run.id);
    return { retried: runs.length };
  }

  async completeRequiredAction(applicationId: string, action: WorkflowOutcome['requiredAction'], message: string) {
    if (!action) return null;
    const run = await this.prisma.recruitmentWorkflowRun.findFirst({ where: { applicationId, action, status: 'WAITING' }, orderBy: { createdAt: 'desc' } });
    if (!run) return null;
    const outcome: WorkflowOutcome = { status: 'COMPLETED', action, requiredAction: action, message };
    await this.prisma.recruitmentWorkflowRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', result: outcome as object, error: null } });
    await this.prisma.applicationEvent.create({ data: { applicationId, type: 'WORKFLOW_COMPLETED', note: message } });
    return outcome;
  }

  private async perform(applicationId: string, action: string): Promise<WorkflowOutcome> {
    if (action === 'SEND_BEHAVIORAL_ASSESSMENT' || action === 'SEND_TECHNICAL_ASSESSMENT') {
      const app = await this.application(applicationId);
      const kind = action === 'SEND_TECHNICAL_ASSESSMENT' ? 'TECHNICAL' : 'BEHAVIORAL';
      const sent = await this.assessments.send(app.companyId, app.workflowActorId ?? app.fallbackActorId, applicationId, { kind, validDays: 3, reusePending: true });
      if (!sent.emailed) throw new Error(`${kind === 'TECHNICAL' ? 'Teste técnico' : 'Questionário comportamental'} criado, mas o e-mail não foi entregue; nova tentativa agendada.`);
      return { status: 'COMPLETED', action, emailed: true, message: `${kind === 'TECHNICAL' ? 'Teste técnico' : 'Questionário comportamental'} criado e enviado por e-mail.` };
    }
    const required = ({ SCHEDULE_INTERVIEW: 'SCHEDULE_INTERVIEW', PREPARE_OFFER: 'PREPARE_OFFER', REQUEST_DOCUMENTS: 'REQUEST_DOCUMENTS', COMPLETE_ADMISSION: 'COMPLETE_ADMISSION' } as const)[action as 'SCHEDULE_INTERVIEW'];
    if (required) return { status: 'WAITING', action, requiredAction: required, message: this.requiredMessage(required) };
    if (action === 'NOTIFY_STAGE_CHANGE') {
      const app = await this.application(applicationId);
      if (!app.candidate.email) return { status: 'COMPLETED', action, emailed: false, message: 'Etapa alterada; candidato sem e-mail.' };
      const statusUrl = (await issueTrackingToken(this.prisma, app.id, app.companyId)).url;
      const sent = await this.mail.send(app.candidate.email, candidateStageChangedEmail({ name: app.candidate.name, jobTitle: app.job.title, company: app.job.company.name, stage: app.stage?.candidateLabel || app.stage?.name || 'Nova etapa', statusUrl }));
      if (!sent.sent) throw new Error(`E-mail da nova etapa não entregue${sent.error ? `: ${sent.error}` : '; nova tentativa agendada.'}`);
      return { status: 'COMPLETED', action, emailed: true, message: 'Candidato avisado por e-mail.' };
    }
    return { status: 'COMPLETED', action, message: 'Etapa atualizada.' };
  }

  private async application(id: string) {
    const app = await this.prisma.application.findUnique({ where: { id }, include: { candidate: { select: { name: true, email: true } }, job: { select: { id: true, title: true, company: { select: { name: true } } } }, stage: { select: { name: true, candidateLabel: true } } } });
    if (!app) throw new Error('Candidatura não encontrada para executar a automação.');
    const actor = await this.prisma.applicationEvent.findFirst({ where: { applicationId: id, userId: { not: null } }, orderBy: { createdAt: 'desc' }, select: { userId: true } });
    const fallback = await this.prisma.user.findFirst({ where: { companyId: app.companyId, role: { in: ['RH', 'ADMIN', 'DEV'] } }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!actor?.userId && !fallback?.id) throw new Error('Nenhum responsável disponível para a automação.');
    return { ...app, workflowActorId: actor?.userId ?? null, fallbackActorId: fallback!.id };
  }

  private requiredMessage(action: WorkflowOutcome['requiredAction']) {
    if (action === 'SCHEDULE_INTERVIEW') return 'Defina data, horário e formato para enviar o convite.';
    if (action === 'PREPARE_OFFER') return 'Prepare e aprove a proposta antes de enviá-la.';
    if (action === 'REQUEST_DOCUMENTS') return 'Selecione os documentos obrigatórios e envie o link seguro.';
    return 'Conclua a conferência de admissão antes de criar o funcionário.';
  }
}
