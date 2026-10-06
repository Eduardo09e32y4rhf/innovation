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
import { HireCandidateDto } from './dto/hire-candidate.dto';
import type { Prisma } from '@prisma/client';
import { JobsRepository } from './jobs.repository';
import { JobsStorageService } from './jobs-storage.service';
import { RecruitmentService } from './recruitment.service';
import { normalizeAnswerValue, validateAnswerShape, type RuleQuestion } from './recruitment-rules';

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

@Injectable()
export class JobsService {
  constructor(
    private readonly repository: JobsRepository,
    private readonly storage: JobsStorageService,
    private readonly recruitment: RecruitmentService,
  ) {}

  async list(companyId: string, jobScope: Prisma.JobWhereInput = {}) {
    const [jobs, counts] = await Promise.all([this.repository.list(companyId, jobScope), this.repository.applicationCountsByJob(companyId)]);
    return jobs.map((job) => {
      const rows = counts.filter((row) => row.jobId === job.id);
      const by = (status: string) => rows.find((row) => row.status === status)?._count ?? 0;
      return {
        ...job,
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
    return job;
  }

  private async assertJobQuota(companyId: string) {
    const quota = await this.repository.monthlyJobQuota(companyId);
    if (quota && quota.used >= quota.limit) {
      throw new BadRequestException({ code: 'JOB_QUOTA_REACHED', message: `Seu plano R&S inclui ${quota.limit} vagas por mês e todas já foram abertas. Aumente a quantidade contratada em Faturas (cada vaga extra custa R$ 2,00 por mês) para abrir mais.` });
    }
  }

  async create(companyId: string, dto: CreateJobDto) {
    await this.assertJobQuota(companyId);
    return this.repository.create(companyId, this.normalizeJob(dto));
  }

  async update(companyId: string, id: string, dto: UpdateJobDto) {
    await this.get(companyId, id);
    const result = await this.repository.update(companyId, id, this.normalizeJob(dto));
    if (!result.count) throw new NotFoundException('Vaga nao encontrada.');
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

  async delete(companyId: string, id: string) {
    const job = await this.get(companyId, id);
    if (job._count.applications > 0) {
      await this.repository.update(companyId, id, { status: 'CLOSED' });
      return { deleted: false, archived: true };
    }
    const result = await this.repository.delete(companyId, id);
    if (!result.count) throw new NotFoundException('Vaga nao encontrada.');
    return { deleted: true };
  }

  async hire(companyId: string, applicationId: string, actorId: string, dto: HireCandidateDto) {
    if (!dto.department?.trim() || !dto.contractType?.trim() || !dto.admissionDate) {
      throw new BadRequestException('Informe departamento, tipo de contrato e data de admissao antes de contratar o candidato.');
    }
    const result = await this.repository.hire(companyId, applicationId, actorId, dto);
    if (!result) throw new NotFoundException('Candidatura nao encontrada.');
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
    if (!job) throw new NotFoundException('Vaga nao encontrada ou encerrada.');
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
    const evaluation = await this.recruitment.evaluateApplication(questions, answerValues);

    const normalizedEmail = dto.email.trim().toLowerCase();
    const safeName = dto.name.trim();
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `${job.companyId}/${job.id}/${randomUUID()}-${hash.slice(0, 12)}.${format.extension}`;
    await this.storage.save(storageKey, file.buffer);

    try {
      const result = await this.repository.apply(
        job.companyId,
        job.id,
        { ...dto, source: 'CAREERS_PORTAL', name: safeName, email: normalizedEmail },
        {
          key: storageKey,
          name: this.safeFileName(file.filename, format.extension),
          type: format.mime,
          size: file.buffer.length,
        },
        {
          answers: [...answerValues].map(([questionId, value]) => ({ questionId, value })),
          score: evaluation.score,
          knockedOut: evaluation.knockedOut,
          knockoutReason: evaluation.reason,
          rejectOnKnockout: evaluation.reject,
        },
      );
      if (result.duplicate) {
        await this.storage.remove(storageKey);
        throw new ConflictException('Voce ja se inscreveu nesta vaga. Sua candidatura esta em analise.');
      }
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
    if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
      throw new BadRequestException('A faixa salarial minima nao pode ser maior que a maxima.');
    }
    return {
      ...rest,
      title: dto.title?.trim(),
      description: dto.description?.trim(),
      location: dto.location?.trim() || undefined,
      employmentType: dto.employmentType?.trim() || undefined,
      salaryRange: dto.salaryRange?.trim() || undefined,
      department: dto.department?.trim() || undefined,
      seniority: dto.seniority?.trim() || undefined,
      benefits: dto.benefits?.map((item) => item.trim()).filter(Boolean),
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
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      return {
        extension: 'docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (ext === 'docx') {
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
