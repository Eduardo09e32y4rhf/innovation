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
import { JobsRepository } from './jobs.repository';
import { JobsStorageService } from './jobs-storage.service';

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

@Injectable()
export class JobsService {
  constructor(
    private readonly repository: JobsRepository,
    private readonly storage: JobsStorageService,
  ) {}

  list(companyId: string) {
    return this.repository.list(companyId);
  }

  async get(companyId: string, id: string) {
    const job = await this.repository.find(companyId, id);
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return job;
  }

  create(companyId: string, dto: CreateJobDto) {
    return this.repository.create(companyId, this.normalizeJob(dto));
  }

  async update(companyId: string, id: string, dto: UpdateJobDto) {
    await this.get(companyId, id);
    const result = await this.repository.update(companyId, id, this.normalizeJob(dto));
    if (!result.count) throw new NotFoundException('Vaga não encontrada.');
    return this.get(companyId, id);
  }

  async delete(companyId: string, id: string) {
    const job = await this.get(companyId, id);
    if (job._count.applications > 0) {
      await this.repository.update(companyId, id, { status: 'CLOSED' });
      return { deleted: false, archived: true };
    }
    const result = await this.repository.delete(companyId, id);
    if (!result.count) throw new NotFoundException('Vaga não encontrada.');
    return { deleted: true };
  }

  async applications(companyId: string, jobId: string) {
    await this.get(companyId, jobId);
    const applications = await this.repository.applications(companyId, jobId);
    return applications.map((application) => ({
      ...application,
      candidate: {
        ...application.candidate,
        resumeUrl: undefined,
        resumeAvailable: Boolean(application.candidate.resumeUrl),
        resumeDownloadPath: application.candidate.resumeUrl
          ? `/jobs/applications/${application.id}/resume`
          : null,
      },
    }));
  }

  async updateApplicationStatus(companyId: string, id: string, status: string) {
    const application = await this.repository.updateApplicationStatus(companyId, id, status);
    if (!application) throw new NotFoundException('Candidatura não encontrada.');
    return application;
  }

  async hire(companyId: string, applicationId: string, actorId: string, dto: HireCandidateDto) {
    const result = await this.repository.hire(companyId, applicationId, actorId, dto);
    if (!result) throw new NotFoundException('Candidatura não encontrada.');
    return result;
  }

  async publicJobs(companyKey: string) {
    const company = await this.repository.publicCompany(companyKey);
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    return { company, jobs: await this.repository.publicJobs(company.id) };
  }

  async publicJob(companyKey: string, jobId: string) {
    const company = await this.repository.publicCompany(companyKey);
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    const job = await this.repository.publicJob(company.id, jobId);
    if (!job) throw new NotFoundException('Vaga não encontrada ou encerrada.');
    return { company, job };
  }

  async publicJobById(jobId: string) {
    const job = await this.repository.publicJobById(jobId);
    if (!job) throw new NotFoundException('Vaga não encontrada ou encerrada.');
    const { company, ...details } = job;
    return { company, job: { ...details, company } };
  }

  async allPublicJobs() {
    return this.repository.allPublicJobs();
  }

  async apply(jobId: string, raw: Record<string, unknown>, file?: {
    buffer: Buffer; filename: string; mimetype?: string;
  }) {
    const cleanedRaw = Object.fromEntries(
      Object.entries(raw || {}).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? undefined : v])
    );
    const dto = plainToInstance(ApplyJobDto, cleanedRaw);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) throw new BadRequestException('Revise os dados da candidatura.');
    if (dto.website) return { received: true };
    if (!file?.buffer?.length) throw new BadRequestException('Envie seu currículo em PDF ou DOCX.');
    if (file.buffer.length > MAX_RESUME_SIZE) throw new BadRequestException('O currículo deve ter no máximo 5 MB.');

    const format = this.detectResumeFormat(file.buffer, file.filename);
    if (!format) throw new BadRequestException('Currículo inválido. Envie um arquivo PDF ou DOCX verdadeiro.');

    const job = await this.repository.publicJobById(jobId);
    if (!job) throw new NotFoundException('Vaga não encontrada ou encerrada.');

    const normalizedEmail = dto.email.trim().toLowerCase();
    const safeName = dto.name.trim();
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `${job.companyId}/${job.id}/${randomUUID()}-${hash.slice(0, 12)}.${format.extension}`;
    await this.storage.save(storageKey, file.buffer);

    const screening = this.screen(job.title, job.description, dto.coverLetter);
    try {
      const result = await this.repository.apply(job.companyId, job.id, {
        ...dto,
        name: safeName,
        email: normalizedEmail,
        aiScore: screening.score,
        aiSummary: screening.summary,
      }, {
        key: storageKey,
        name: this.safeFileName(file.filename, format.extension),
        type: format.mime,
        size: file.buffer.length,
      });
      if (result.duplicate) {
        await this.storage.remove(storageKey);
        throw new ConflictException('Você já se inscreveu nesta vaga! Sua candidatura está em análise.');
      }
      return { received: true, applicationId: result.application.id };
    } catch (error) {
      if (!(error instanceof ConflictException)) await this.storage.remove(storageKey);
      throw error;
    }
  }

  async resume(companyId: string, applicationId: string) {
    const application = await this.repository.application(companyId, applicationId);
    if (!application?.candidate.resumeUrl) throw new NotFoundException('Currículo não encontrado.');
    return {
      stream: this.storage.stream(application.candidate.resumeUrl),
      name: application.candidate.resumeName || 'curriculo',
      type: application.candidate.resumeType || 'application/octet-stream',
    };
  }

  private normalizeJob(dto: CreateJobDto | UpdateJobDto) {
    return {
      ...dto,
      title: dto.title?.trim(),
      description: dto.description?.trim(),
      location: dto.location?.trim() || undefined,
      employmentType: dto.employmentType?.trim() || undefined,
      salaryRange: dto.salaryRange?.trim() || undefined,
      benefits: dto.benefits?.map((item) => item.trim()).filter(Boolean),
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
    if (ext === 'docx' || ext === 'doc') {
      return {
        extension: 'docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    return { extension: 'pdf', mime: 'application/pdf' };
  }

  private safeFileName(original: string, extension: string) {
    const base = String(original || 'curriculo')
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/\.(pdf|docx)$/i, '')
      .slice(0, 120);
    return `${base || 'curriculo'}.${extension}`;
  }

  private screen(title: string, description: string, coverLetter?: string) {
    const stop = new Set(['para', 'com', 'uma', 'das', 'dos', 'que', 'por', 'de', 'do', 'da', 'em', 'e']);
    const terms = `${title} ${description}`.toLowerCase().match(/[\p{L}\p{N}+#.]{3,}/gu) || [];
    const relevant = [...new Set(terms.filter((term) => !stop.has(term)))].slice(0, 30);
    const source = String(coverLetter || '').toLowerCase();
    const matches = relevant.filter((term) => source.includes(term));
    const score = coverLetter
      ? Math.min(95, Math.max(20, 35 + Math.round((matches.length / Math.max(relevant.length, 1)) * 60)))
      : 25;
    const summary = coverLetter
      ? `Triagem preliminar: ${matches.length} requisito(s) textual(is) compatíveis. Avaliação humana obrigatória antes de qualquer decisão.`
      : 'Triagem preliminar limitada: candidatura sem carta de apresentação. Avaliação humana obrigatória.';
    return { score, summary };
  }
}
