import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApplyJobDto } from './dto/apply-job.dto';
import { CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { HireCandidateDto } from './dto/hire-candidate.dto';
import type { Prisma } from '@prisma/client';
import { JobsRepository } from './jobs.repository';
import { JobsStorageService } from './jobs-storage.service';
import { RecruitmentService } from './recruitment.service';
import { jobLifecycle, statusChange } from './job-lifecycle';
import { normalizeAnswerValue, validateAnswerShape, type RuleQuestion } from './recruitment-rules';
import { normalizeSource } from './application-source';
import { RecruitmentPrivacyService } from './recruitment-privacy.service';
import { JobWorkflowService } from './job-workflow.service';

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

@Injectable()
export class JobsService {
  constructor(
    private readonly repository: JobsRepository,
    private readonly storage: JobsStorageService,
    private readonly recruitment: RecruitmentService,
    private readonly privacy: RecruitmentPrivacyService,
    private readonly workflow: JobWorkflowService,
    private readonly documents: RecruitmentDocumentsService,
  ) {}

  async list(companyId: string, jobScope: Prisma.JobWhereInput = {}) {
    const [jobs, counts] = await Promise.all([this.repository.list(companyId, jobScope), this.repository.applicationCountsByJob(companyId)]);
    return jobs.map((job) => {
      const rows = counts.filter((row) => row.jobId === job.id);
      const by = (status: string) => rows.find((row) => row.status === status)?._count ?? 0;
      return {
        ...job,
        lifecycle: jobLifecycle(job),
        pipeline: {
          new: by('APPLIED'),
          inProgress: by('SCREENING') + by('INTERVIEW') + by('OFFER'),
          hired: by('HIRED'),
          rejected: by('REJECTED'),
        },
      };
    });
  }

  async get(companyId: string, id: string) {
    const job = await this.repository.find(companyId, id);
    if (!job) throw new NotFoundException('Vaga nao encontrada.');
    return { ...job, lifecycle: jobLifecycle(job) };
  }

  private async assertJobQuota(companyId: string) {
    const quota = await this.repository.monthlyJobQuota(companyId);
    if (quota && quota.used >= quota.limit) {
      const price = quota.extraPrice ? ` (cada vaga extra custa ${quota.extraPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por mês)` : '';
      throw new BadRequestException({ code: 'JOB_QUOTA_REACHED', message: `Seu plano R&S inclui ${quota.limit} vagas por mês e todas já foram abertas. Aumente a quantidade contratada em Faturas${price} para abrir mais.` });
    }
  }

  async create(companyId: string, dto: CreateJobDto) {
    await this.assertJobQuota(companyId);
    const gate = await this.workflow.prepare(companyId, { currentStatus: null, nextStatus: dto.status ?? 'OPEN', department: dto.department, openings: dto.openings });
    const job = await this.repository.create(companyId, { ...this.normalizeJob(dto), status: gate.status });
    if (gate.startApproval) await this.workflow.startApproval(companyId, job.id, gate.steps);
    return job;
  }

  async update(companyId: string, id: string, dto: UpdateJobDto) {
    const current = await this.get(companyId, id);
    // Encerrar grava a data; reativar vale por 30 dias e NAO conta como vaga nova no limite do plano (nao passa por assertJobQuota).
    const change = dto.status ? statusChange(current, dto.status) : { ok: true as const, data: {} };
    if (!change.ok) throw new BadRequestException({ code: 'JOB_REACTIVATION_EXPIRED', message: change.message });
    const gate = await this.workflow.prepare(companyId, { currentStatus: current.status, nextStatus: dto.status, department: dto.department ?? current.department, openings: dto.openings ?? current.openings, jobId: id });
    const result = await this.repository.update(companyId, id, { ...this.normalizeJob(dto), ...change.data, ...(dto.status ? { status: gate.status } : {}) });
    if (!result.count) throw new NotFoundException('Vaga nao encontrada.');
    if (gate.startApproval) await this.workflow.startApproval(companyId, id, gate.steps);
    return this.get(companyId, id);
  }

  async duplicate(companyId: string, id: string) {
    await this.assertJobQuota(companyId);
    const job = await this.get(companyId, id);
    const [questions, criteria] = await Promise.all([
      this.recruitment.getQuestions(companyId, id),
      this.recruitment.getCriteria(companyId, id),
    ]);
    const copy = await this.repository.create(companyId, {
      title: `${job.title} (cópia)`,
      description: job.description,
      location: job.location,
      employmentType: job.employmentType,
      salaryRange: job.salaryRange,
      benefits: job.benefits,
      requirements: job.requirements,
      department: job.department,
      workMode: job.workMode,
      seniority: job.seniority,
      openings: job.openings,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryHidden: job.salaryHidden,
      pipelineId: job.pipelineId,
      interviewGuide: job.interviewGuide ?? [],
      screeningMinScore: job.screeningMinScore,
      screeningAction: job.screeningAction,
      isInternal: job.isInternal,
      confidential: job.confidential,
      status: 'DRAFT',
    });
    if (questions.length) {
      await this.recruitment.saveQuestions(companyId, copy.id, {
        questions: questions.map((question) => ({
          label: question.label,
          type: question.type as any,
          required: question.required,
          options: question.options,
          knockout: question.knockout as any,
          scoreRule: question.scoreRule as any,
        })),
      });
    }
    if (criteria.length) {
      await this.recruitment.saveCriteria(companyId, copy.id, {
        criteria: criteria.map((item) => ({ name: item.name, weight: item.weight })),
      });
    }
    return copy;
  }

  /** Cargos para o titulo da vaga: cargos cadastrados, cargos dos funcionarios e titulos de vagas anteriores. */
  async titleSuggestions(companyId: string) {
    const { custom, employees, jobs } = await this.repository.titleSources(companyId);
    const seen = new Set<string>();
    const titles: { title: string; source: 'company' | 'job'; department?: string | null }[] = [];
    const add = (title: string | null | undefined, source: 'company' | 'job', department?: string | null) => {
      const clean = String(title ?? '').replace(/\s*\(c[oó]pia\)\s*$/i, '').trim();
      const key = clean.toLowerCase();
      if (!clean || seen.has(key)) return;
      seen.add(key);
      titles.push({ title: clean, source, department });
    };
    for (const job of jobs) add(job.title, 'job', job.department);
    for (const row of custom) add(row.name, 'company');
    for (const row of employees) add(row.position, 'company');
    return { titles };
  }

  /**
   * Arquivar (padrao): encerra a vaga, sai das abertas e pode ser reativada em ate 30 dias; candidaturas preservadas.
   * Permanente: apaga a vaga, candidaturas, avaliacoes, entrevistas e arquivos. Nao tem volta; bloqueia se houver contratado.
   */
  async delete(companyId: string, id: string, actorId?: string, mode: 'archive' | 'permanent' = 'archive') {
    const job = await this.get(companyId, id);
    if (mode === 'permanent') {
      const plan = await this.repository.permanentDeletePlan(companyId, id);
      if (plan.hired > 0) throw new BadRequestException('Esta vaga tem candidato contratado e não pode ser excluída de vez, para manter o histórico da admissão. Arquive a vaga.');
      const result = await this.repository.delete(companyId, id);
      if (!result.count) throw new NotFoundException('Vaga nao encontrada.');
      for (const key of [...plan.resumeKeys, ...plan.documentKeys]) await this.storage.remove(key).catch(() => undefined);
      if (actorId) await this.repository.audit(companyId, actorId, 'JOB_DELETED_PERMANENTLY', id, { title: job.title, applications: job._count.applications }).catch(() => undefined);
      return { deleted: true, archived: false };
    }
    if (job._count.applications === 0 && job.status === 'DRAFT') {
      await this.repository.delete(companyId, id);
      return { deleted: true, archived: false };
    }
    if (job.status !== 'CLOSED' && job.status !== 'FILLED') await this.repository.update(companyId, id, { status: 'CLOSED', closedAt: new Date() });
    return { deleted: false, archived: true };
  }

  async hire(companyId: string, applicationId: string, actorId: string, dto: HireCandidateDto) {
    if (!dto.department?.trim() || !dto.contractType?.trim() || !dto.admissionDate) {
      throw new BadRequestException('Informe departamento, tipo de contrato e data de admissao antes de contratar o candidato.');
    }
    const result = await this.repository.hire(companyId, applicationId, actorId, dto);
    if (!result) throw new NotFoundException('Candidatura nao encontrada.');
    if (!result.alreadyHired) void this.documents.sendHireWelcome(companyId, actorId, applicationId, dto.admissionDate, dto.contractType);
    return result;
  }

  // ─── Portal público ─────────────────────────────────────────────
  private toPublicJob<T extends Record<string, any>>(job: T) {
    const { salaryHidden, salaryMin, salaryMax, salaryRange, ...rest } = job;
    return {
      ...rest,
      salaryRange: salaryHidden ? null : salaryRange ?? null,
      salaryMin: salaryHidden ? null : salaryMin ?? null,
      salaryMax: salaryHidden ? null : salaryMax ?? null,
      salaryHidden: Boolean(salaryHidden),
      questions: Array.isArray(job.questions)
        ? job.questions.map(({ knockout, scoreRule, ...question }: any) => question)
        : undefined,
    };
  }

  async publicJobs(companyKey: string) {
    const company = await this.repository.publicCompany(companyKey);
    if (!company) throw new NotFoundException('Empresa nao encontrada.');
    const jobs = await this.repository.publicJobs(company.id);
    return { company, jobs: jobs.map((job) => this.toPublicJob(job)) };
  }

  async publicJobsCatalog() {
    const jobs = await this.repository.publicJobsCatalog();
    return { jobs: jobs.map((job) => this.toPublicJob(job)) };
  }

  async publicJob(companyKey: string, jobId: string) {
    const company = await this.repository.publicCompany(companyKey);
    if (!company) throw new NotFoundException('Empresa nao encontrada.');
    const job = await this.repository.publicJob(company.id, jobId);
    if (!job) throw new NotFoundException('Vaga nao encontrada ou encerrada.');
    return { company, job: this.toPublicJob(job) };
  }

  async publicJobById(jobId: string) {
    const job = await this.repository.publicJobById(jobId);
    if (!job) {
      // Encerrada ha menos de 30 dias: continua visivel, mas nao recebe candidaturas.
      const closed = await this.repository.publicRecentlyClosedById(jobId);
      if (!closed) throw new NotFoundException('Vaga nao encontrada ou encerrada.');
      const { company: closedCompany, closedAt, ...closedDetails } = closed;
      return { company: closedCompany, job: { ...this.toPublicJob(closedDetails), company: closedCompany, closed: true, acceptsApplications: false, closedAt } };
    }
    const { company, ...details } = job;
    return { company, job: { ...this.toPublicJob(details), company } };
  }

  async allPublicJobs() {
    const { jobs, companies } = await this.repository.allPublicJobs();
    return { jobs: jobs.map((job) => this.toPublicJob(job)), companies };
  }

  private parseAnswers(raw: unknown): Record<string, unknown> {
    if (!raw) return {};
    if (typeof raw === 'object') return raw as Record<string, unknown>;
    try {
      const parsed = JSON.parse(String(raw));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      throw new BadRequestException('Respostas do formulario invalidas.');
    }
  }

  async apply(
    jobId: string,
    raw: Record<string, unknown>,
    file?: { buffer: Buffer; filename: string; mimetype?: string },
  ) {
    const { answers: rawAnswers, ...rawFields } = raw || {};
    const cleanedRaw = Object.fromEntries(
      Object.entries(rawFields).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? undefined : v]),
    );
    const dto = plainToInstance(ApplyJobDto, cleanedRaw);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) {
      const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
      const fieldLabels: Record<string, string> = { name: 'nome', email: 'e-mail', phone: 'telefone', linkedinUrl: 'LinkedIn', coverLetter: 'apresentacao', consent: 'consentimento' };
      const fields = errors.map((error) => fieldLabels[error.property] ?? error.property);
      throw new BadRequestException({
        message: `Revise os campos: ${fields.join(', ')}. ${messages[0] ?? ''}`.trim(),
        fields: Object.fromEntries(errors.map((error) => [error.property, Object.values(error.constraints ?? {})[0] ?? 'Valor invalido'])),
      });
    }
    if (dto.website) return { received: true };
    if (!file?.buffer?.length) throw new BadRequestException('Envie seu curriculo em PDF ou DOCX.');
    if (file.buffer.length > MAX_RESUME_SIZE) throw new BadRequestException('O curriculo deve ter no maximo 5 MB.');

    const format = this.detectResumeFormat(file.buffer, file.filename);
    if (!format) throw new BadRequestException('Curriculo invalido. Envie um arquivo PDF ou DOCX verdadeiro.');

    const job = await this.repository.jobForApplication(jobId);
    if (!job) throw new NotFoundException('Vaga nao encontrada ou encerrada.');

    const questions: RuleQuestion[] = job.questions.map((question: any) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      options: question.options,
      knockout: question.knockout,
      scoreRule: question.scoreRule,
    }));
    const submitted = this.parseAnswers(rawAnswers);
    const answerValues = new Map<string, string>();
    for (const question of questions) {
      const value = normalizeAnswerValue(question, submitted[question.id]);
      const problem = validateAnswerShape(question, value);
      if (problem) throw new BadRequestException({ message: problem, fields: { [`question:${question.id}`]: problem } });
      if (value) answerValues.set(question.id, value);
    }
    const evaluation = await this.recruitment.evaluateApplication(questions, answerValues, { minScore: job.screeningMinScore, action: job.screeningAction });

    const normalizedEmail = dto.email.trim().toLowerCase();
    const safeName = dto.name.trim();
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `${job.companyId}/${job.id}/${randomUUID()}-${hash.slice(0, 12)}.${format.extension}`;
    await this.storage.save(storageKey, file.buffer);

    try {
      const result = await this.repository.apply(
        job.companyId,
        job.id,
        { ...dto, source: normalizeSource(dto.source), name: safeName, email: normalizedEmail },
        {
          key: storageKey,
          name: this.safeFileName(file.filename, format.extension),
          type: format.mime,
          size: file.buffer.length,
        },
        {
          answers: [...answerValues].map(([questionId, value]) => ({ questionId, value })),
          score: evaluation.scored ? evaluation.score : null,
          knockedOut: evaluation.knockedOut,
          knockoutReason: evaluation.reason,
          rejectOnKnockout: evaluation.reject,
        },
      );
      if (result.duplicate) {
        await this.storage.remove(storageKey);
        throw new ConflictException('Voce ja se inscreveu nesta vaga. Sua candidatura esta em analise.');
      }
      await this.privacy.afterApply(result.application.id, { gender: dto.gender, race: dto.race, pcd: dto.pcd });
      // Reprovado por pergunta eliminatoria: o retorno ao candidato sai 24h depois (InterviewFollowupService.sendDelayedKnockoutFeedback).
      return { received: true, applicationId: result.application.id };
    } catch (error) {
      if (!(error instanceof ConflictException)) await this.storage.remove(storageKey);
      throw error;
    }
  }

  async resume(companyId: string, applicationId: string) {
    const application = await this.repository.application(companyId, applicationId);
    if (!application?.resumeUrl) throw new NotFoundException('Curriculo nao encontrado.');
    return {
      stream: this.storage.stream(application.resumeUrl),
      name: application.resumeName || 'curriculo',
      type: application.resumeType || 'application/octet-stream',
    };
  }

  private normalizeJob(dto: CreateJobDto | UpdateJobDto) {
    const { deadline, salaryMin, salaryMax, ...rest } = dto;
    // Campo apagado na edicao chega vazio/null e precisa limpar o banco (antes o valor antigo voltava).
    const optional = (value: string | null | undefined) => (value === undefined ? undefined : String(value ?? '').trim() || null);
    if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
      throw new BadRequestException('A faixa salarial minima nao pode ser maior que a maxima.');
    }
    return {
      ...rest,
      title: dto.title?.trim(),
      description: dto.description?.trim(),
      location: optional(dto.location),
      employmentType: optional(dto.employmentType),
      salaryRange: optional(dto.salaryRange),
      department: optional(dto.department),
      seniority: optional(dto.seniority),
      ...('workMode' in dto ? { workMode: optional((dto as { workMode?: string | null }).workMode) } : {}),
      benefits: dto.benefits?.map((item) => item.trim()).filter(Boolean),
      interviewGuide: dto.interviewGuide?.map((item) => item.trim()).filter(Boolean),
      requirements: dto.requirements?.map((item) => item.trim()).filter(Boolean),
      salaryMin,
      salaryMax,
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
    };
  }

  private detectResumeFormat(buffer: Buffer, filename?: string) {
    const head = buffer.subarray(0, 2048).toString('ascii');
    if (head.includes('%PDF')) {
      return { extension: 'pdf', mime: 'application/pdf' };
    }
    // ZIP qualquer (xlsx, zip, apk) nao e curriculo: o DOCX tem a pasta word/ dentro.
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer.includes(Buffer.from('word/'))) {
      return {
        extension: 'docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    return null;
  }

  private safeFileName(original: string, extension: string) {
    const base = String(original || 'curriculo')
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/\.(pdf|docx)$/i, '')
      .slice(0, 120);
    return `${base || 'curriculo'}.${extension}`;
  }
}

