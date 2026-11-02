import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JobsService } from './jobs.service';
import { RecruitmentService } from './recruitment.service';

/** Modelos de vaga reutilizáveis: guardam campos, perguntas e critérios para abrir vagas parecidas em segundos. */
@Injectable()
export class JobTemplatesService {
  constructor(private readonly prisma: PrismaService, private readonly jobs: JobsService, private readonly recruitment: RecruitmentService) {}

  list(companyId: string) {
    return this.prisma.jobTemplate.findMany({ where: { companyId }, orderBy: { name: 'asc' }, select: { id: true, name: true, createdAt: true } });
  }

  async createFromJob(companyId: string, userId: string, jobId: string, name: string) {
    const label = name.trim();
    if (label.length < 2) throw new BadRequestException('Dê um nome ao modelo.');
    const job = await this.jobs.get(companyId, jobId);
    const [questions, criteria] = await Promise.all([this.recruitment.getQuestions(companyId, jobId), this.recruitment.getCriteria(companyId, jobId)]);
    const data = {
      title: job.title, description: job.description, location: job.location, employmentType: job.employmentType, salaryRange: job.salaryRange, benefits: job.benefits, requirements: job.requirements,
      department: job.department, workMode: job.workMode, seniority: job.seniority, openings: job.openings, salaryMin: job.salaryMin, salaryMax: job.salaryMax, salaryHidden: job.salaryHidden, pcd: job.pcd,
      questions: questions.map((q) => ({ label: q.label, type: q.type, required: q.required, options: q.options, knockout: q.knockout, scoreRule: q.scoreRule })),
      criteria: criteria.map((c) => ({ name: c.name, weight: c.weight })),
    };
    return this.prisma.jobTemplate.create({ data: { companyId, name: label, data: JSON.parse(JSON.stringify(data)), createdBy: userId }, select: { id: true, name: true } });
  }

  async remove(companyId: string, id: string) {
    const result = await this.prisma.jobTemplate.deleteMany({ where: { id, companyId } });
    if (!result.count) throw new NotFoundException('Modelo não encontrado.');
    return { deleted: true };
  }

  /** Cria uma vaga em rascunho a partir do modelo. Publicar passa pelo mesmo caminho de qualquer vaga (limite do plano, orçamento, aprovação). */
  async use(companyId: string, id: string, actorId?: string) {
    const template = await this.prisma.jobTemplate.findFirst({ where: { id, companyId } });
    if (!template) throw new NotFoundException('Modelo não encontrado.');
    const { questions = [], criteria = [], ...fields } = template.data as Record<string, any>;
    const job = await this.jobs.create(companyId, { ...fields, status: 'DRAFT' } as any, actorId);
    if (questions.length) await this.recruitment.saveQuestions(companyId, job.id, { questions });
    if (criteria.length) await this.recruitment.saveCriteria(companyId, job.id, { criteria });
    return job;
  }
}