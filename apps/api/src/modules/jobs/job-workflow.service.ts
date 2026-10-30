import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { UserRole } from '@prisma/client';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { approvalOutcome, approverRoles, APPROVAL_STALE_DAYS, BUDGET_STATUSES, canDecide, currentStep, headcountCheck, needsApproval, normalizeSteps, STEP_LABEL, waitingDays, type ApprovalStep } from './job-workflow';
import { RecruiterNotifierService } from './recruiter-notifier.service';

@Injectable()
export class JobWorkflowService {
  private readonly logger = new Logger(JobWorkflowService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifier: RecruiterNotifierService) {}

  async getSteps(companyId: string): Promise<ApprovalStep[]> {
    const row = await this.prisma.recruitmentSetting.findUnique({ where: { companyId }, select: { approvalSteps: true } });
    return normalizeSteps(row?.approvalSteps);
  }

  async setSteps(companyId: string, steps: unknown) {
    const approvalSteps = normalizeSteps(steps);
    await this.prisma.recruitmentSetting.upsert({ where: { companyId }, create: { companyId, approvalSteps }, update: { approvalSteps } });
    return { steps: approvalSteps };
  }

  /**
   * Antes de gravar a vaga: confere o orçamento da área e decide se ela vai para aprovação.
   * `startApproval` indica que, depois de gravar, é preciso criar as etapas da requisição.
   */
  async prepare(companyId: string, input: { currentStatus: string | null; nextStatus?: string; department?: string | null; openings?: number; jobId?: string }) {
    const steps = await this.getSteps(companyId);
    const approval = needsApproval(steps, input.currentStatus, input.nextStatus);
    const entersBudget = input.nextStatus !== undefined && BUDGET_STATUSES.includes(approval ? 'PENDING_APPROVAL' : input.nextStatus) && !BUDGET_STATUSES.includes(input.currentStatus ?? '');
    if (entersBudget && input.department?.trim()) {
      const budget = await this.prisma.areaHeadcount.findUnique({ where: { companyId_department: { companyId, department: input.department.trim() } } });
      if (budget) {
        const used = await this.prisma.job.aggregate({ where: { companyId, department: input.department.trim(), status: { in: BUDGET_STATUSES as any }, ...(input.jobId ? { id: { not: input.jobId } } : {}) }, _sum: { openings: true } });
        const check = headcountCheck(budget.budget, used._sum.openings ?? 0, input.openings ?? 1);
        if (!check.ok) throw new BadRequestException({ code: 'HEADCOUNT_EXCEEDED', message: check.message });
      }
    }
    return { status: approval ? 'PENDING_APPROVAL' : input.nextStatus, startApproval: approval, steps };
  }

  async startApproval(companyId: string, jobId: string, steps: ApprovalStep[], requestedBy?: string | null) {
    await this.prisma.$transaction([
      this.prisma.jobApproval.deleteMany({ where: { jobId } }),
      this.prisma.jobApproval.createMany({ data: steps.map((step, position) => ({ companyId, jobId, step, position, requestedBy: requestedBy ?? null })) }),
    ]);
    await this.notifyTurn(companyId, jobId, 'JOB_APPROVAL_TURN');
  }

  /** Avisa (e-mail + sino) o perfil da etapa da vez. Nunca derruba a acao principal: o notificador engole falhas. */
  private async notifyTurn(companyId: string, jobId: string, kind: 'JOB_APPROVAL_TURN' | 'JOB_APPROVAL_REMINDER', extra?: string) {
    try {
      const [job, rows] = await Promise.all([
        this.prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true, title: true, department: true } }),
        this.prisma.jobApproval.findMany({ where: { jobId }, orderBy: { position: 'asc' } }),
      ]);
      const step = currentStep(rows);
      if (!job || !step) return false;
      const roles = approverRoles(step.step);
      const users = await this.prisma.user.findMany({ where: { companyId, isActive: true, role: { in: roles as UserRole[] } }, select: { id: true } });
      const label = STEP_LABEL[step.step as ApprovalStep] ?? step.step;
      const reminder = kind === 'JOB_APPROVAL_REMINDER';
      await this.notifier.notify({
        companyId, jobId, kind, userIds: users.map((user) => user.id), roles: roles as UserRole[], priority: reminder ? 'HIGH' : 'NORMAL', cta: 'Abrir requisição',
        title: reminder ? 'Lembrete: requisição de vaga aguardando aprovação' : 'Requisição de vaga aguardando sua aprovação',
        lines: [`A vaga "${job.title}"${job.department ? ` (${job.department})` : ''} espera a etapa ${label}.${extra ? ` ${extra}` : ''}`, 'Abra a vaga em Vagas e recrutamento para aprovar ou recusar.'],
      });
      return true;
    } catch (error) {
      this.logger.warn(`Aviso de aprovação não enviado: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  /** Resultado final da requisição para quem pediu (aprovada ou recusada com o motivo). */
  private async notifyResult(companyId: string, jobId: string, jobTitle: string, requestedBy: string | null | undefined, outcome: 'APPROVED' | 'REJECTED', note?: string | null, decidedStep?: string) {
    const approved = outcome === 'APPROVED';
    await this.notifier.notify({
      companyId, jobId, kind: approved ? 'JOB_APPROVAL_APPROVED' : 'JOB_APPROVAL_REJECTED', userIds: [requestedBy], roles: ['RH', 'ADMIN'] as UserRole[], priority: approved ? 'NORMAL' : 'HIGH', cta: 'Abrir vaga',
      title: approved ? 'Requisição de vaga aprovada' : 'Requisição de vaga recusada',
      lines: approved
        ? [`A vaga "${jobTitle}" foi aprovada em todas as etapas e já está aberta para candidaturas.`]
        : [`A vaga "${jobTitle}" foi recusada${decidedStep ? ` na etapa ${STEP_LABEL[decidedStep as ApprovalStep] ?? decidedStep}` : ''} e voltou para rascunho.`, `Motivo: ${note?.trim() || 'não informado'}.`, 'Ajuste a vaga e envie novamente para aprovação.'],
    });
  }

  /** Lembrete diário (dias úteis): etapa da vez parada há APPROVAL_STALE_DAYS ou mais, no máximo um lembrete por período. */
  @Cron('0 12 * * 1-5')
  @CronLock('recruitment.approval-reminder', 3600)
  async remindStale(now = new Date()) {
    const jobs = await this.prisma.job.findMany({ where: { status: 'PENDING_APPROVAL' }, select: { id: true, companyId: true } });
    let reminded = 0;
    for (const job of jobs) {
      const rows = await this.prisma.jobApproval.findMany({ where: { jobId: job.id }, orderBy: { position: 'asc' } });
      const step = currentStep(rows);
      if (!step) continue;
      const current = rows.find((row) => row.step === step.step);
      if (!current) continue;
      const idle = waitingDays(rows, current, now);
      const sinceReminder = current.remindedAt ? Math.floor((now.getTime() - current.remindedAt.getTime()) / 86_400_000) : Infinity;
      if (idle < APPROVAL_STALE_DAYS || sinceReminder < APPROVAL_STALE_DAYS) continue;
      if (await this.notifyTurn(job.companyId, job.id, 'JOB_APPROVAL_REMINDER', `Está parada há ${idle} dia(s).`)) {
        await this.prisma.jobApproval.update({ where: { id: current.id }, data: { remindedAt: now } });
        reminded++;
      }
    }
    return { reminded };
  }

  /**
   * Leitura por papel (API-06): DEV/ADMIN/RH veem as etapas de qualquer vaga da empresa; GESTOR, CEO e CONTABIL so veem
   * a vaga em que ha uma etapa que o proprio perfil decide (lista vazia nas demais, sem revelar que a vaga existe).
   */
  async approvalsFor(companyId: string, jobId: string, actor: { role?: string }) {
    const all = await this.approvals(companyId, jobId);
    if (['DEV', 'ADMIN', 'RH', 'RH_RS'].includes(String(actor.role))) return all;
    return all.some((row) => canDecide(row.step, String(actor.role))) ? all : [];
  }

  async approvals(companyId: string, jobId: string) {
    const rows = await this.prisma.jobApproval.findMany({ where: { companyId, jobId }, orderBy: { position: 'asc' } });
    const ids = rows.map((row) => row.decidedBy).filter((id): id is string => Boolean(id));
    const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const current = currentStep(rows);
    return rows.map((row) => ({ ...row, label: STEP_LABEL[row.step as ApprovalStep] ?? row.step, decidedByName: users.find((user) => user.id === row.decidedBy)?.name ?? null, current: current?.step === row.step }));
  }

  /** Aprovar ou recusar a etapa da vez. Todas aprovadas abre a vaga; uma recusa devolve a vaga para rascunho com o motivo. */
  async decide(companyId: string, jobId: string, actor: JwtUser, dto: { approve: boolean; note?: string }) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true, title: true, status: true } });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    if (job.status !== 'PENDING_APPROVAL') throw new BadRequestException('Esta vaga não está aguardando aprovação.');
    const rows = await this.prisma.jobApproval.findMany({ where: { jobId }, orderBy: { position: 'asc' } });
    const step = currentStep(rows);
    if (!step) throw new BadRequestException('Não há etapa pendente para decidir.');
    if (!canDecide(step.step, actor.role)) throw new ForbiddenException(`A etapa ${STEP_LABEL[step.step as ApprovalStep] ?? step.step} deve ser decidida por outro perfil.`);
    if (!dto.approve && !(dto.note ?? '').trim()) throw new BadRequestException('Informe o motivo da recusa.');

    await this.prisma.jobApproval.updateMany({ where: { jobId, step: step.step }, data: { status: dto.approve ? 'APPROVED' : 'REJECTED', decidedBy: actor.sub, decidedAt: new Date(), note: dto.note?.trim() || null } });
    const all = await this.prisma.jobApproval.findMany({ where: { jobId } });
    const outcome = approvalOutcome(all);
    const requestedBy = all.find((row) => row.requestedBy)?.requestedBy ?? null;
    if (outcome === 'APPROVED') await this.prisma.job.updateMany({ where: { id: jobId, companyId }, data: { status: 'OPEN', closedAt: null } });
    if (outcome === 'REJECTED') await this.prisma.job.updateMany({ where: { id: jobId, companyId }, data: { status: 'DRAFT' } });
    if (outcome === 'PENDING') await this.notifyTurn(companyId, jobId, 'JOB_APPROVAL_TURN');
    else await this.notifyResult(companyId, jobId, job.title, requestedBy, outcome, dto.note, step.step);
    return { outcome, approvals: await this.approvals(companyId, jobId) };
  }

  /** Fila "minhas aprovações": requisições que esperam o perfil do usuário agora, com dias parada e atraso. */
  async pendingFor(companyId: string, actor: JwtUser, now = new Date()) {
    const jobs = await this.prisma.job.findMany({ where: { companyId, status: 'PENDING_APPROVAL' }, select: { id: true, title: true, department: true, openings: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
    const rows = await this.prisma.jobApproval.findMany({ where: { companyId, jobId: { in: jobs.map((job) => job.id) } } });
    const mine = jobs.flatMap((job) => {
      const jobRows = rows.filter((row) => row.jobId === job.id);
      const step = currentStep(jobRows);
      const current = step ? jobRows.find((row) => row.step === step.step) : undefined;
      if (!step || !current || !canDecide(step.step, actor.role)) return [];
      const days = waitingDays(jobRows, current, now);
      return [{ ...job, step: step.step, stepLabel: STEP_LABEL[step.step as ApprovalStep], waitingDays: days, overdue: days >= APPROVAL_STALE_DAYS, requestedBy: current.requestedBy ?? null }];
    });
    const ids = [...new Set(mine.map((item) => item.requestedBy).filter((id): id is string => Boolean(id)))];
    const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    return mine.map(({ requestedBy, ...item }) => ({ ...item, requestedByName: users.find((user) => user.id === requestedBy)?.name ?? null }));
  }

  // ---------- orçamento de vagas por área ----------
  async budgets(companyId: string) {
    const [rows, jobs] = await Promise.all([
      this.prisma.areaHeadcount.findMany({ where: { companyId }, orderBy: { department: 'asc' } }),
      this.prisma.job.groupBy({ by: ['department'], where: { companyId, status: { in: BUDGET_STATUSES as any }, department: { not: null } }, _sum: { openings: true } }),
    ]);
    const used = new Map(jobs.map((row) => [row.department ?? '', row._sum.openings ?? 0]));
    const departments = [...new Set([...rows.map((row) => row.department), ...jobs.map((row) => row.department ?? '').filter(Boolean)])].sort();
    return departments.map((department) => ({ department, budget: rows.find((row) => row.department === department)?.budget ?? null, used: used.get(department) ?? 0 }));
  }

  async saveBudget(companyId: string, department: string, budget: number | null) {
    const name = department.trim();
    if (!name) throw new BadRequestException('Informe a área.');
    if (budget === null) { await this.prisma.areaHeadcount.deleteMany({ where: { companyId, department: name } }); return this.budgets(companyId); }
    if (!Number.isInteger(budget) || budget < 0 || budget > 10_000) throw new BadRequestException('Orçamento inválido.');
    await this.prisma.areaHeadcount.upsert({ where: { companyId_department: { companyId, department: name } }, create: { companyId, department: name, budget }, update: { budget } });
    return this.budgets(companyId);
  }
}