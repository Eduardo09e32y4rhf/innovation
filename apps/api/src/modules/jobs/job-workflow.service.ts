import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { approvalOutcome, BUDGET_STATUSES, canDecide, currentStep, headcountCheck, needsApproval, normalizeSteps, STEP_LABEL, type ApprovalStep } from './job-workflow';

@Injectable()
export class JobWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

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

  async startApproval(companyId: string, jobId: string, steps: ApprovalStep[]) {
    await this.prisma.$transaction([
      this.prisma.jobApproval.deleteMany({ where: { jobId } }),
      this.prisma.jobApproval.createMany({ data: steps.map((step, position) => ({ companyId, jobId, step, position })) }),
    ]);
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
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true, status: true } });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    if (job.status !== 'PENDING_APPROVAL') throw new BadRequestException('Esta vaga não está aguardando aprovação.');
    const rows = await this.prisma.jobApproval.findMany({ where: { jobId }, orderBy: { position: 'asc' } });
    const step = currentStep(rows);
    if (!step) throw new BadRequestException('Não há etapa pendente para decidir.');
    if (!canDecide(step.step, actor.role)) throw new ForbiddenException(`A etapa ${STEP_LABEL[step.step as ApprovalStep] ?? step.step} deve ser decidida por outro perfil.`);
    if (!dto.approve && !(dto.note ?? '').trim()) throw new BadRequestException('Informe o motivo da recusa.');

    await this.prisma.jobApproval.updateMany({ where: { jobId, step: step.step }, data: { status: dto.approve ? 'APPROVED' : 'REJECTED', decidedBy: actor.sub, decidedAt: new Date(), note: dto.note?.trim() || null } });
    const outcome = approvalOutcome(await this.prisma.jobApproval.findMany({ where: { jobId } }));
    if (outcome === 'APPROVED') await this.prisma.job.updateMany({ where: { id: jobId, companyId }, data: { status: 'OPEN', closedAt: null } });
    if (outcome === 'REJECTED') await this.prisma.job.updateMany({ where: { id: jobId, companyId }, data: { status: 'DRAFT' } });
    return { outcome, approvals: await this.approvals(companyId, jobId) };
  }

  /** Requisições que esperam o perfil do usuário agora. */
  async pendingFor(companyId: string, actor: JwtUser) {
    const jobs = await this.prisma.job.findMany({ where: { companyId, status: 'PENDING_APPROVAL' }, select: { id: true, title: true, department: true, openings: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
    const rows = await this.prisma.jobApproval.findMany({ where: { companyId, jobId: { in: jobs.map((job) => job.id) } } });
    return jobs.flatMap((job) => {
      const step = currentStep(rows.filter((row) => row.jobId === job.id));
      return step && canDecide(step.step, actor.role) ? [{ ...job, step: step.step, stepLabel: STEP_LABEL[step.step as ApprovalStep] }] : [];
    });
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