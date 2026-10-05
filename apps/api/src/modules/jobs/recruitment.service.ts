import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BulkApplicationsDto,
  InterviewDto,
  MoveApplicationDto,
  QuestionInputDto,
  SaveCriteriaDto,
  SaveEvaluationsDto,
  SavePipelineDto,
  SaveQuestionsDto,
  SavedViewDto,
  TagDto,
} from './dto/recruitment.dto';
import { weightedEvaluationScore, evaluateAnswer, type RuleQuestion } from './recruitment-rules';

export const DEFAULT_STAGES = [
  { name: 'Inscritos', color: '#6366f1', kind: 'APPLIED' },
  { name: 'Em análise', color: '#0ea5e9', kind: 'SCREENING' },
  { name: 'Entrevista', color: '#f59e0b', kind: 'INTERVIEW' },
  { name: 'Proposta', color: '#8b5cf6', kind: 'OFFER' },
  { name: 'Contratado', color: '#10b981', kind: 'HIRED' },
  { name: 'Reprovado', color: '#f43f5e', kind: 'REJECTED' },
] as const;

export interface ApplicationFilters {
  q?: string;
  stageId?: string;
  tagId?: string;
  favorite?: string;
  minScore?: string;
  minRating?: string;
  source?: string;
  from?: string;
  to?: string;
  knockedOut?: string;
  answerQ?: string;
  answerV?: string;
  sort?: string;
}

type Tx = any;

const candidateStatusFor = (kind: string) => (kind === 'APPLIED' ? 'NEW' : kind);

@Injectable()
export class RecruitmentService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Funil (pipeline) ───────────────────────────────────────────
  async ensureDefaultPipeline(companyId: string) {
    const existing = await this.prisma.hiringPipeline.findFirst({
      where: { companyId, isDefault: true },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (existing) return existing;
    return this.prisma.hiringPipeline.create({
      data: {
        companyId,
        name: 'Funil padrão',
        isDefault: true,
        stages: { create: DEFAULT_STAGES.map((stage, position) => ({ ...stage, position })) },
      },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
  }

  async pipelineForJob(companyId: string, job: { pipelineId: string | null }) {
    if (job.pipelineId) {
      const own = await this.prisma.hiringPipeline.findFirst({
        where: { id: job.pipelineId, companyId },
        include: { stages: { orderBy: { position: 'asc' } } },
      });
      if (own) return own;
    }
    return this.ensureDefaultPipeline(companyId);
  }

  getPipeline(companyId: string) {
    return this.ensureDefaultPipeline(companyId);
  }

  async savePipeline(companyId: string, dto: SavePipelineDto) {
    const pipeline = await this.ensureDefaultPipeline(companyId);
    const kinds = new Set(dto.stages.map((stage) => stage.kind));
    for (const required of ['APPLIED', 'HIRED', 'REJECTED']) {
      if (!kinds.has(required as any)) {
        throw new BadRequestException('O funil precisa ter ao menos uma etapa inicial, uma de contratação e uma de reprovação.');
      }
    }
    const names = dto.stages.map((stage) => stage.name.trim().toLowerCase());
    if (names.some((name) => !name) || new Set(names).size !== names.length) {
      throw new BadRequestException('Cada etapa precisa de um nome único.');
    }

    await this.prisma.$transaction(async (tx) => {
      const keepIds = dto.stages.map((stage) => stage.id).filter(Boolean) as string[];
      const current = pipeline.stages;
      const invalid = keepIds.filter((id) => !current.some((stage) => stage.id === id));
      if (invalid.length) throw new BadRequestException('Etapa inválida.');

      for (const stage of current.filter((item) => !keepIds.includes(item.id))) {
        const fallback = dto.stages.find((item) => item.kind === stage.kind && item.id);
        const target = fallback?.id ?? null;
        if (!target) {
          const used = await tx.application.count({ where: { stageId: stage.id } });
          if (used) {
            throw new BadRequestException(`A etapa "${stage.name}" tem candidatos. Mantenha outra etapa do mesmo tipo para recebê-los.`);
          }
        } else {
          await tx.application.updateMany({ where: { stageId: stage.id }, data: { stageId: target } });
        }
        await tx.pipelineStage.delete({ where: { id: stage.id } });
      }

      for (const [position, stage] of dto.stages.entries()) {
        const data = { name: stage.name.trim(), color: stage.color || '#6b7280', kind: stage.kind as any, position };
        if (stage.id) {
          const before = current.find((item) => item.id === stage.id);
          await tx.pipelineStage.update({ where: { id: stage.id }, data });
          if (before && before.kind !== stage.kind) {
            await tx.application.updateMany({ where: { stageId: stage.id, status: { not: 'HIRED' } }, data: { status: stage.kind as any } });
          }
        } else {
          await tx.pipelineStage.create({ data: { ...data, pipelineId: pipeline.id } });
        }
      }
      if (dto.name?.trim()) await tx.hiringPipeline.update({ where: { id: pipeline.id }, data: { name: dto.name.trim() } });
    });
    return this.getPipeline(companyId);
  }

  private async remapApplications(companyId: string, jobId: string, pipeline: { id: string; stages: any[] }) {
    const orphans = await this.prisma.application.findMany({
      where: { companyId, jobId, OR: [{ stageId: null }, { stage: { pipelineId: { not: pipeline.id } } }] },
      select: { id: true, status: true },
    });
    if (!orphans.length) return;
    const byKind = new Map<string, string[]>();
    for (const item of orphans) byKind.set(item.status, [...(byKind.get(item.status) ?? []), item.id]);
    for (const [kind, ids] of byKind) {
      const stage = pipeline.stages.find((item) => item.kind === kind) ?? pipeline.stages[0];
      await this.prisma.application.updateMany({ where: { id: { in: ids } }, data: { stageId: stage.id } });
    }
  }

  // ─── Perguntas e critérios ──────────────────────────────────────
  private async assertJob(companyId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId } });
    if (!job) throw new NotFoundException('Vaga nao encontrada.');
    return job;
  }

  async getQuestions(companyId: string, jobId: string) {
    await this.assertJob(companyId, jobId);
    return this.prisma.jobQuestion.findMany({ where: { jobId }, orderBy: { position: 'asc' } });
  }

  private validateQuestion(question: QuestionInputDto) {
    const options = (question.options ?? []).map((option) => option.trim()).filter(Boolean);
    if (['SELECT', 'MULTI'].includes(question.type) && options.length < 2) {
      throw new BadRequestException(`Adicione ao menos 2 opções em: ${question.label}`);
    }
    return options;
  }

  async saveQuestions(companyId: string, jobId: string, dto: SaveQuestionsDto) {
    await this.assertJob(companyId, jobId);
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.jobQuestion.findMany({ where: { jobId }, select: { id: true } });
      const keep = dto.questions.map((question) => question.id).filter(Boolean) as string[];
      await tx.jobQuestion.deleteMany({ where: { jobId, id: { in: current.map((item) => item.id).filter((id) => !keep.includes(id)) } } });
      for (const [position, question] of dto.questions.entries()) {
        const options = this.validateQuestion(question);
        const data = {
          label: question.label.trim(),
          type: question.type,
          required: Boolean(question.required),
          options,
          position,
          knockout: (question.knockout ?? undefined) as any,
          scoreRule: (question.scoreRule ?? undefined) as any,
        };
        if (question.id && current.some((item) => item.id === question.id)) {
          await tx.jobQuestion.update({
            where: { id: question.id },
            data: { ...data, knockout: question.knockout ?? (null as any), scoreRule: question.scoreRule ?? (null as any) },
          });
        } else {
          await tx.jobQuestion.create({ data: { ...data, jobId } });
        }
      }
    });
    return this.getQuestions(companyId, jobId);
  }

  async getCriteria(companyId: string, jobId: string) {
    await this.assertJob(companyId, jobId);
    return this.prisma.jobCriterion.findMany({ where: { jobId }, orderBy: { position: 'asc' } });
  }

  async saveCriteria(companyId: string, jobId: string, dto: SaveCriteriaDto) {
    await this.assertJob(companyId, jobId);
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.jobCriterion.findMany({ where: { jobId }, select: { id: true } });
      const keep = dto.criteria.map((item) => item.id).filter(Boolean) as string[];
      await tx.jobCriterion.deleteMany({ where: { jobId, id: { in: current.map((item) => item.id).filter((id) => !keep.includes(id)) } } });
      for (const [position, item] of dto.criteria.entries()) {
        const data = { name: item.name.trim(), weight: item.weight, position };
        if (item.id && current.some((existing) => existing.id === item.id)) {
          await tx.jobCriterion.update({ where: { id: item.id }, data });
        } else {
          await tx.jobCriterion.create({ data: { ...data, jobId } });
        }
      }
    });
    return this.getCriteria(companyId, jobId);
  }

  // ─── Candidaturas ───────────────────────────────────────────────
  private buildWhere(companyId: string, jobId: string, filters: ApplicationFilters) {
    const where: any = { companyId, jobId };
    if (filters.stageId) where.stageId = filters.stageId;
    if (filters.tagId) where.tags = { some: { tagId: filters.tagId } };
    if (filters.favorite === 'true') where.favorite = true;
    if (filters.knockedOut === 'true') where.knockedOut = true;
    if (filters.knockedOut === 'false') where.knockedOut = false;
    if (filters.source) where.source = filters.source;
    if (filters.minScore && Number.isFinite(Number(filters.minScore))) where.score = { gte: Number(filters.minScore) };
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
      };
    }
    const and: any[] = [];
    if (filters.q?.trim()) {
      const q = filters.q.trim();
      and.push({
        OR: [
          { candidate: { name: { contains: q, mode: 'insensitive' } } },
          { candidate: { email: { contains: q, mode: 'insensitive' } } },
          { candidate: { phone: { contains: q } } },
          { coverLetter: { contains: q, mode: 'insensitive' } },
          { answers: { some: { value: { contains: q, mode: 'insensitive' } } } },
        ],
      });
    }
    if (filters.answerQ && filters.answerV?.trim()) {
      and.push({ answers: { some: { questionId: filters.answerQ, value: { contains: filters.answerV.trim(), mode: 'insensitive' } } } });
    }
    if (and.length) where.AND = and;
    return where;
  }

  private present(app: any, criteria: { id: string; weight: number }[], questions: Map<string, any>) {
    const evalScore = weightedEvaluationScore(
      (app.evaluations ?? []).map((item: any) => ({ criterionId: item.criterionId, score: item.score })),
      criteria,
    );
    return {
      id: app.id,
      jobId: app.jobId,
      status: app.status,
      stageId: app.stageId,
      stageMovedAt: app.stageMovedAt ?? app.createdAt,
      createdAt: app.createdAt,
      source: app.source,
      score: app.score,
      evaluationScore: evalScore,
      favorite: app.favorite,
      knockedOut: app.knockedOut,
      knockoutReason: app.knockoutReason,
      rejectionReason: app.rejectionReason,
      coverLetter: app.coverLetter ?? app.candidate?.coverLetter ?? null,
      linkedinUrl: app.linkedinUrl ?? app.candidate?.linkedinUrl ?? null,
      resumeAvailable: Boolean(app.resumeUrl),
      resumeName: app.resumeName,
      resumeDownloadPath: app.resumeUrl ? `/jobs/applications/${app.id}/resume` : null,
      candidate: app.candidate
        ? {
            id: app.candidate.id,
            name: app.candidate.name,
            email: app.candidate.email,
            phone: app.candidate.phone,
            admittedEmployeeId: app.candidate.admittedEmployee?.id ?? null,
          }
        : null,
      tags: (app.tags ?? []).map((item: any) => item.tag),
      answers: (app.answers ?? []).map((answer: any) => {
        const question = questions.get(answer.questionId);
        const evaluation = question ? evaluateAnswer(question, answer.value) : null;
        return {
          questionId: answer.questionId,
          label: question?.label ?? 'Pergunta removida',
          type: question?.type ?? 'TEXT',
          value: answer.value,
          points: evaluation?.points ?? 0,
          knockedOut: evaluation?.knockedOut ?? false,
        };
      }),
    };
  }

  async listApplications(companyId: string, jobId: string, filters: ApplicationFilters) {
    const job = await this.assertJob(companyId, jobId);
    const pipeline = await this.pipelineForJob(companyId, job);
    await this.remapApplications(companyId, jobId, pipeline);
    const [questions, criteria] = await Promise.all([
      this.prisma.jobQuestion.findMany({ where: { jobId } }),
      this.prisma.jobCriterion.findMany({ where: { jobId } }),
    ]);
    const orderBy: any =
      filters.sort === 'score' ? [{ score: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
      : filters.sort === 'name' ? [{ candidate: { name: 'asc' } }]
      : filters.sort === 'oldest' ? [{ createdAt: 'asc' }]
      : [{ createdAt: 'desc' }];
    const applications = await this.prisma.application.findMany({
      where: this.buildWhere(companyId, jobId, filters),
      include: {
        candidate: { include: { admittedEmployee: { select: { id: true } } } },
        tags: { include: { tag: true } },
        answers: true,
        evaluations: true,
      },
      orderBy,
      take: 500,
    });
    const questionMap = new Map(questions.map((question) => [question.id, question]));
    let items = applications.map((app) => this.present(app, criteria, questionMap));
    if (filters.minRating && Number.isFinite(Number(filters.minRating))) {
      items = items.filter((item) => (item.evaluationScore ?? 0) >= Number(filters.minRating));
    }
    if (filters.sort === 'rating') {
      items.sort((a, b) => (b.evaluationScore ?? -1) - (a.evaluationScore ?? -1));
    }
    return { pipeline, questions, criteria, applications: items };
  }

  async getApplication(companyId: string, id: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, companyId },
      include: {
        candidate: { include: { admittedEmployee: { select: { id: true } } } },
        tags: { include: { tag: true } },
        answers: true,
        evaluations: true,
        notes: { orderBy: { createdAt: 'desc' } },
        interviews: { orderBy: { scheduledAt: 'asc' } },
        events: { orderBy: { createdAt: 'desc' }, take: 100 },
        job: { select: { id: true, title: true } },
      },
    });
    if (!app) throw new NotFoundException('Candidatura nao encontrada.');
    const [questions, criteria] = await Promise.all([
      this.prisma.jobQuestion.findMany({ where: { jobId: app.jobId } }),
      this.prisma.jobCriterion.findMany({ where: { jobId: app.jobId }, orderBy: { position: 'asc' } }),
    ]);
    return {
      ...this.present(app, criteria, new Map(questions.map((question) => [question.id, question]))),
      job: app.job,
      criteria,
      evaluations: app.evaluations,
      notes: app.notes,
      interviews: app.interviews,
      events: app.events,
    };
  }

  private async moveInTx(tx: Tx, companyId: string, userId: string, id: string, dto: { stageId: string; note?: string; rejectionReason?: string }) {
    const app = await tx.application.findFirst({ where: { id, companyId }, include: { stage: true } });
    if (!app) throw new NotFoundException('Candidatura nao encontrada.');
    if (app.status === 'HIRED') throw new BadRequestException('Candidato já contratado não pode mudar de etapa.');
    const stage = await tx.pipelineStage.findFirst({ where: { id: dto.stageId, pipeline: { companyId } } });
    if (!stage) throw new BadRequestException('Etapa inválida.');
    if (stage.kind === 'HIRED') throw new BadRequestException('Use "Contratar" para admitir o candidato.');
    if (stage.kind === 'REJECTED' && !(dto.rejectionReason ?? '').trim()) {
      throw new BadRequestException('Informe o motivo da reprovação.');
    }
    if (app.stageId === stage.id) return app;

    const updated = await tx.application.update({
      where: { id },
      data: {
        stageId: stage.id,
        status: stage.kind,
        stageMovedAt: new Date(),
        rejectionReason: stage.kind === 'REJECTED' ? dto.rejectionReason!.trim() : null,
      },
    });
    await tx.candidate.update({ where: { id: app.candidateId }, data: { status: candidateStatusFor(stage.kind) } });
    await tx.applicationEvent.create({
      data: {
        applicationId: id,
        userId,
        type: stage.kind === 'REJECTED' ? 'REJECTED' : 'STAGE_CHANGED',
        fromStage: app.stage?.name ?? null,
        toStage: stage.name,
        note: dto.note?.trim() || dto.rejectionReason?.trim() || null,
      },
    });
    return updated;
  }

  moveApplication(companyId: string, userId: string, id: string, dto: MoveApplicationDto) {
    return this.prisma.$transaction((tx) => this.moveInTx(tx, companyId, userId, id, dto));
  }

  async bulk(companyId: string, userId: string, dto: BulkApplicationsDto) {
    const apps = await this.prisma.application.findMany({ where: { companyId, id: { in: dto.ids } }, select: { id: true } });
    const ids = apps.map((item) => item.id);
    if (!ids.length) throw new NotFoundException('Nenhuma candidatura encontrada.');

    if (dto.action === 'MOVE') {
      if (!dto.stageId) throw new BadRequestException('Escolha a etapa de destino.');
      let moved = 0;
      const errors: string[] = [];
      for (const id of ids) {
        try {
          await this.prisma.$transaction((tx) => this.moveInTx(tx, companyId, userId, id, { stageId: dto.stageId!, rejectionReason: dto.rejectionReason }));
          moved += 1;
        } catch (error: any) {
          errors.push(error?.message ?? 'Falha ao mover');
        }
      }
      return { moved, failed: errors.length, errors: [...new Set(errors)] };
    }
    if (dto.action === 'FAVORITE') {
      await this.prisma.application.updateMany({ where: { id: { in: ids } }, data: { favorite: dto.value !== false } });
      return { updated: ids.length };
    }
    if (!dto.tagId) throw new BadRequestException('Escolha a tag.');
    const tag = await this.prisma.recruitmentTag.findFirst({ where: { id: dto.tagId, companyId } });
    if (!tag) throw new BadRequestException('Tag inválida.');
    if (dto.action === 'TAG_ADD') {
      await this.prisma.applicationTag.createMany({ data: ids.map((applicationId) => ({ applicationId, tagId: tag.id })), skipDuplicates: true });
    } else {
      await this.prisma.applicationTag.deleteMany({ where: { applicationId: { in: ids }, tagId: tag.id } });
    }
    return { updated: ids.length };
  }

  async setFavorite(companyId: string, id: string, favorite: boolean) {
    const result = await this.prisma.application.updateMany({ where: { id, companyId }, data: { favorite } });
    if (!result.count) throw new NotFoundException('Candidatura nao encontrada.');
    return { id, favorite };
  }

  private async assertApplication(companyId: string, id: string) {
    const app = await this.prisma.application.findFirst({ where: { id, companyId }, select: { id: true, jobId: true } });
    if (!app) throw new NotFoundException('Candidatura nao encontrada.');
    return app;
  }

  async addNote(companyId: string, userId: string, id: string, body: string) {
    await this.assertApplication(companyId, id);
    if (!body.trim()) throw new BadRequestException('Escreva a anotação.');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    return this.prisma.applicationNote.create({
      data: { applicationId: id, userId, authorName: user?.name || user?.email || null, body: body.trim() },
    });
  }

  async saveEvaluations(companyId: string, userId: string, id: string, dto: SaveEvaluationsDto) {
    const app = await this.assertApplication(companyId, id);
    const criteria = await this.prisma.jobCriterion.findMany({ where: { jobId: app.jobId }, select: { id: true } });
    const valid = new Set(criteria.map((item) => item.id));
    if (dto.evaluations.some((item) => !valid.has(item.criterionId))) throw new BadRequestException('Critério inválido.');
    await this.prisma.$transaction(
      dto.evaluations.map((item) =>
        this.prisma.applicationEvaluation.upsert({
          where: { applicationId_criterionId_userId: { applicationId: id, criterionId: item.criterionId, userId } },
          create: { applicationId: id, criterionId: item.criterionId, userId, score: item.score, comment: item.comment?.trim() || null },
          update: { score: item.score, comment: item.comment?.trim() || null },
        }),
      ),
    );
    await this.prisma.applicationEvent.create({ data: { applicationId: id, userId, type: 'EVALUATED', note: 'Avaliação registrada' } });
    return this.getApplication(companyId, id);
  }

  async addInterview(companyId: string, userId: string, id: string, dto: InterviewDto) {
    await this.assertApplication(companyId, id);
    const interview = await this.prisma.applicationInterview.create({
      data: {
        applicationId: id,
        scheduledAt: new Date(dto.scheduledAt),
        kind: dto.kind?.trim() || 'ENTREVISTA',
        location: dto.location?.trim() || null,
        interviewer: dto.interviewer?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
    await this.prisma.applicationEvent.create({
      data: { applicationId: id, userId, type: 'INTERVIEW', note: `Entrevista agendada para ${new Date(dto.scheduledAt).toLocaleString('pt-BR')}` },
    });
    return interview;
  }

  async deleteInterview(companyId: string, id: string, interviewId: string) {
    await this.assertApplication(companyId, id);
    await this.prisma.applicationInterview.deleteMany({ where: { id: interviewId, applicationId: id } });
    return { deleted: true };
  }

  // ─── Tags ───────────────────────────────────────────────────────
  listTags(companyId: string) {
    return this.prisma.recruitmentTag.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  }

  async createTag(companyId: string, dto: TagDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Informe o nome da tag.');
    return this.prisma.recruitmentTag.upsert({
      where: { companyId_name: { companyId, name } },
      create: { companyId, name, color: dto.color || '#7c3aed' },
      update: { color: dto.color || undefined },
    });
  }

  async deleteTag(companyId: string, id: string) {
    await this.prisma.recruitmentTag.deleteMany({ where: { id, companyId } });
    return { deleted: true };
  }

  async setApplicationTags(companyId: string, id: string, tagIds: string[]) {
    await this.assertApplication(companyId, id);
    const tags = await this.prisma.recruitmentTag.findMany({ where: { companyId, id: { in: tagIds } }, select: { id: true } });
    await this.prisma.$transaction([
      this.prisma.applicationTag.deleteMany({ where: { applicationId: id } }),
      this.prisma.applicationTag.createMany({ data: tags.map((tag) => ({ applicationId: id, tagId: tag.id })) }),
    ]);
    return { id, tagIds: tags.map((tag) => tag.id) };
  }

  // ─── Visões salvas ──────────────────────────────────────────────
  listViews(companyId: string, userId: string) {
    return this.prisma.recruitmentSavedView.findMany({ where: { companyId, userId }, orderBy: { createdAt: 'desc' } });
  }

  createView(companyId: string, userId: string, dto: SavedViewDto) {
    return this.prisma.recruitmentSavedView.create({
      data: { companyId, userId, name: dto.name.trim(), filters: dto.filters as any },
    });
  }

  async deleteView(companyId: string, userId: string, id: string) {
    await this.prisma.recruitmentSavedView.deleteMany({ where: { id, companyId, userId } });
    return { deleted: true };
  }

  // ─── Métricas, banco de talentos e exportação ───────────────────
  async stats(companyId: string, jobScope: Prisma.JobWhereInput = {}) {
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 86_400_000);
    const stale = new Date(now.getTime() - 3 * 86_400_000);
    const [jobs, applications, bySource, last30, waiting, nextInterviews] = await Promise.all([
      this.prisma.job.groupBy({ by: ['status'], where: { companyId, ...jobScope }, _count: true }),
      this.prisma.application.groupBy({ by: ['status'], where: { companyId, job: { is: jobScope } }, _count: true }),
      this.prisma.application.groupBy({ by: ['source'], where: { companyId, job: { is: jobScope } }, _count: true }),
      this.prisma.application.count({ where: { companyId, job: { is: jobScope }, createdAt: { gte: since30 } } }),
      this.prisma.application.count({ where: { companyId, job: { is: jobScope }, status: 'APPLIED', createdAt: { lte: stale } } }),
      this.prisma.applicationInterview.findMany({
        where: { scheduledAt: { gte: now }, application: { companyId, job: { is: jobScope } } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: { application: { select: { id: true, jobId: true, candidate: { select: { name: true } }, job: { select: { title: true } } } } },
      }),
    ]);
    const count = (rows: { status: string; _count: number }[], status: string) => rows.find((row) => row.status === status)?._count ?? 0;
    return {
      jobs: { open: count(jobs as any, 'OPEN'), draft: count(jobs as any, 'DRAFT'), closed: count(jobs as any, 'CLOSED') },
      applications: {
        total: (applications as any[]).reduce((sum, row) => sum + row._count, 0),
        last30Days: last30,
        waitingReview: waiting,
        byStatus: Object.fromEntries((applications as any[]).map((row) => [row.status, row._count])),
        bySource: Object.fromEntries((bySource as any[]).map((row) => [row.source ?? 'OUTRO', row._count])),
      },
      nextInterviews: nextInterviews.map((item) => ({
        id: item.id,
        scheduledAt: item.scheduledAt,
        kind: item.kind,
        applicationId: item.application.id,
        jobId: item.application.jobId,
        candidateName: item.application.candidate.name,
        jobTitle: item.application.job.title,
      })),
    };
  }

  async talentPool(companyId: string, q?: string) {
    const candidates = await this.prisma.candidate.findMany({
      where: {
        companyId,
        ...(q?.trim()
          ? { OR: [{ name: { contains: q.trim(), mode: 'insensitive' } }, { email: { contains: q.trim(), mode: 'insensitive' } }] }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        applications: { select: { id: true, jobId: true, status: true, createdAt: true, job: { select: { title: true } } }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return candidates;
  }

  async exportCsv(companyId: string, jobId: string, filters: ApplicationFilters) {
    const { pipeline, questions, applications } = await this.listApplications(companyId, jobId, filters);
    const stageName = new Map(pipeline.stages.map((stage: any) => [stage.id, stage.name]));
    const escape = (value: unknown) => {
      const text = String(value ?? '').replace(/\r?\n/g, ' ');
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const header = ['Nome', 'E-mail', 'Telefone', 'Etapa', 'Pontuação', 'Avaliação', 'Origem', 'Inscrito em', 'Tags', ...questions.map((question) => question.label)];
    const rows = applications.map((app) => [
      app.candidate?.name,
      app.candidate?.email,
      app.candidate?.phone,
      stageName.get(app.stageId ?? '') ?? app.status,
      app.score ?? '',
      app.evaluationScore ?? '',
      app.source,
      new Date(app.createdAt).toLocaleDateString('pt-BR'),
      app.tags.map((tag: any) => tag.name).join(', '),
      ...questions.map((question) => app.answers.find((answer: any) => answer.questionId === question.id)?.value ?? ''),
    ]);
    return `﻿${[header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n')}`;
  }

  // ─── Usado pela candidatura pública ─────────────────────────────
  async evaluateApplication(
    questions: RuleQuestion[],
    answers: Map<string, string>,
  ) {
    let score = 0;
    let knockedOut = false;
    let reject = false;
    const reasons: string[] = [];
    for (const question of questions) {
      const evaluation = evaluateAnswer(question, answers.get(question.id) ?? '');
      score += evaluation.points;
      if (evaluation.knockedOut) {
        knockedOut = true;
        if (evaluation.action === 'REJECT') reject = true;
        if (evaluation.reason) reasons.push(evaluation.reason);
      }
    }
    return { score, knockedOut, reject, reason: reasons.join('; ') || null };
  }
}
