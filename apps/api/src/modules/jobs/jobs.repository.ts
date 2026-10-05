import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const PUBLIC_JOB_SELECT = {
  id: true,
  title: true,
  description: true,
  location: true,
  employmentType: true,
  salaryRange: true,
  benefits: true,
  requirements: true,
  department: true,
  workMode: true,
  seniority: true,
  openings: true,
  salaryMin: true,
  salaryMax: true,
  salaryHidden: true,
  deadline: true,
  createdAt: true,
  updatedAt: true,
  companyId: true,
} satisfies Prisma.JobSelect;

const PUBLIC_COMPANY_SELECT = { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, city: true, state: true };
const ACTIVE_COMPANY: Prisma.CompanyWhereInput = {
  isActive: true,
  status: 'ACTIVE',
  billingStatus: { notIn: ['CANCELED', 'PENDING_PAYMENT'] },
};
/** Empresa que pode publicar vagas: ativa, sem pendencia de pagamento e com o modulo de recrutamento. */
const PUBLIC_JOB_COMPANY: Prisma.CompanyWhereInput = { ...ACTIVE_COMPANY, activeModules: { has: 'recruitment' } };

const openJob = () => ({
  status: 'OPEN' as const,
  OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
});

/** Politica unica de disponibilidade: catalogo, empresa, detalhe e candidatura usam esta mesma condicao. */
const availablePublicJob = () => ({ ...openJob(), company: PUBLIC_JOB_COMPANY });

const PUBLIC_QUESTION_SELECT = { id: true, label: true, type: true, required: true, options: true } satisfies Prisma.JobQuestionSelect;

@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string, jobScope: Prisma.JobWhereInput = {}) {
    return this.prisma.job.findMany({
      where: { companyId, ...jobScope },
      include: { _count: { select: { applications: true, questions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  applicationCountsByJob(companyId: string) {
    return this.prisma.application.groupBy({ by: ['jobId', 'status'], where: { companyId }, _count: true });
  }

  find(companyId: string, id: string) {
    return this.prisma.job.findFirst({
      where: { companyId, id },
      include: { _count: { select: { applications: true } } },
    });
  }

  create(companyId: string, data: any) {
    return this.prisma.job.create({ data: { ...data, companyId } });
  }

  update(companyId: string, id: string, data: any) {
    return this.prisma.job.updateMany({ where: { companyId, id }, data });
  }

  delete(companyId: string, id: string) {
    return this.prisma.job.deleteMany({ where: { companyId, id } });
  }

  application(companyId: string, id: string) {
    return this.prisma.application.findFirst({
      where: { companyId, id },
      include: {
        candidate: { include: { admittedEmployee: true } },
        job: true,
      },
    });
  }

  async publicCompany(companyKey: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyKey);
    return this.prisma.company.findFirst({
      where: {
        ...ACTIVE_COMPANY,
        OR: [{ slug: companyKey }, ...(isUuid ? [{ id: companyKey }] : [])],
      },
      select: PUBLIC_COMPANY_SELECT,
    });
  }

  publicJobs(companyId: string) {
    return this.prisma.job.findMany({
      where: { companyId, ...availablePublicJob() },
      select: PUBLIC_JOB_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  publicJobsCatalog() {
    return this.prisma.job.findMany({
      where: availablePublicJob(),
      select: { ...PUBLIC_JOB_SELECT, company: { select: PUBLIC_COMPANY_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  publicJob(companyId: string, jobId: string) {
    return this.prisma.job.findFirst({
      where: { companyId, id: jobId, ...availablePublicJob() },
      select: { ...PUBLIC_JOB_SELECT, questions: { select: PUBLIC_QUESTION_SELECT, orderBy: { position: 'asc' } } },
    });
  }

  /** Detalhe publico: so campos da lista de permissao (nada de pipelineId, status ou criterios internos). */
  publicJobById(jobId: string) {
    return this.prisma.job.findFirst({
      where: { id: jobId, ...availablePublicJob() },
      select: {
        ...PUBLIC_JOB_SELECT,
        company: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } },
        questions: { select: PUBLIC_QUESTION_SELECT, orderBy: { position: 'asc' } },
      },
    });
  }

  /** Uso interno da candidatura: precisa dos criterios (knockout/scoreRule), que nunca saem pela API publica. */
  jobForApplication(jobId: string) {
    return this.prisma.job.findFirst({
      where: { id: jobId, ...availablePublicJob() },
      select: {
        id: true,
        companyId: true,
        questions: { select: { ...PUBLIC_QUESTION_SELECT, knockout: true, scoreRule: true }, orderBy: { position: 'asc' } },
      },
    });
  }
  async allPublicJobs() {
    const jobs = await this.prisma.job.findMany({
      where: availablePublicJob(),
      select: { ...PUBLIC_JOB_SELECT, company: { select: PUBLIC_COMPANY_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
    const companies = await this.prisma.company.findMany({
      where: ACTIVE_COMPANY,
      select: PUBLIC_COMPANY_SELECT,
      orderBy: { name: 'asc' },
    });
    return { jobs, companies };
  }

  async apply(
    companyId: string,
    jobId: string,
    data: any,
    resume: { key: string; name: string; type: string; size: number },
    extra: {
      answers: { questionId: string; value: string }[];
      score: number;
      knockedOut: boolean;
      knockoutReason: string | null;
      rejectOnKnockout: boolean;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${companyId}:${data.email}`}))`;

      // Revalida no momento transacional: vaga encerrada/indisponivel entre a leitura e a gravacao nao recebe candidatura.
      const job = await tx.job.findFirst({ where: { id: jobId, companyId, ...availablePublicJob() }, select: { pipelineId: true } });
      if (!job) throw new NotFoundException('Vaga nao encontrada ou encerrada.');

      let candidate = await tx.candidate.findFirst({
        where: { companyId, email: { equals: data.email, mode: 'insensitive' } },
      });

      if (!candidate) {
        candidate = await tx.candidate.create({
          data: { companyId, name: data.name, email: data.email, phone: data.phone, linkedinUrl: data.linkedinUrl, status: 'NEW' },
        });
      } else {
        const duplicate = await tx.application.findFirst({ where: { companyId, candidateId: candidate.id, jobId } });
        if (duplicate) return { duplicate: true as const, application: duplicate };
        candidate = await tx.candidate.update({
          where: { id: candidate.id },
          // O resultado pertence a cada candidatura: nova candidatura nao reverte o estado consolidado do candidato.
          data: { name: data.name, phone: data.phone, linkedinUrl: data.linkedinUrl ?? candidate.linkedinUrl },
        });
      }

      const pipelineId =
        job?.pipelineId ??
        (await tx.hiringPipeline.findFirst({ where: { companyId, isDefault: true }, select: { id: true } }))?.id ??
        null;
      const stages = pipelineId ? await tx.pipelineStage.findMany({ where: { pipelineId }, orderBy: { position: 'asc' } }) : [];
      const firstStage = stages.find((stage) => stage.kind === 'APPLIED') ?? stages[0];
      const rejectedStage = stages.find((stage) => stage.kind === 'REJECTED');
      const autoReject = extra.knockedOut && extra.rejectOnKnockout && rejectedStage;
      const stage = autoReject ? rejectedStage : firstStage;

      const application = await tx.application.create({
        data: {
          companyId,
          candidateId: candidate.id,
          jobId,
          status: autoReject ? 'REJECTED' : 'APPLIED',
          source: data.source ?? 'CAREERS_PORTAL',
          linkedinUrl: data.linkedinUrl,
          coverLetter: data.coverLetter,
          resumeUrl: resume.key,
          resumeName: resume.name,
          resumeType: resume.type,
          resumeSize: resume.size,
          consentGiven: Boolean(data.consent),
          consentAt: data.consent ? new Date() : null,
          stageId: stage?.id,
          stageMovedAt: new Date(),
          score: extra.answers.length ? extra.score : null,
          knockedOut: extra.knockedOut,
          knockoutReason: extra.knockoutReason,
          rejectionReason: autoReject ? extra.knockoutReason : null,
          answers: extra.answers.length ? { create: extra.answers } : undefined,
          events: {
            create: [
              { type: 'APPLIED', toStage: firstStage?.name ?? null, note: 'Candidatura recebida pelo portal' },
              ...(autoReject ? [{ type: 'REJECTED', fromStage: firstStage?.name ?? null, toStage: rejectedStage!.name, note: extra.knockoutReason }] : []),
            ],
          },
        },
      });
      if (autoReject) await tx.candidate.updateMany({ where: { id: candidate.id, status: { not: 'HIRED' } }, data: { status: 'REJECTED' } });

      return { duplicate: false as const, application };
    });
  }

  async hire(companyId: string, applicationId: string, actorId: string, data: any) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const application = await tx.application.findFirst({
          where: { companyId, id: applicationId },
          include: { candidate: { include: { admittedEmployee: true } }, job: true, stage: true },
        });
        if (!application) return null;
        if (application.candidate.admittedEmployee) {
          return { employee: application.candidate.admittedEmployee, alreadyHired: true };
        }

        const preset = data.clinicPresetId
          ? await tx.asoClinicPreset.findFirst({ where: { companyId, id: data.clinicPresetId, active: true } })
          : await tx.asoClinicPreset.findFirst({ where: { companyId, active: true }, orderBy: { createdAt: 'asc' } });

        const notes = [
          'Origem: Portal de Vagas / ATS.',
          application.coverLetter ? `Apresentacao: ${application.coverLetter}` : null,
        ]
          .filter(Boolean)
          .join('\n\n');

        const employee = await tx.employee.create({
          data: {
            companyId,
            originCandidateId: application.candidate.id,
            name: application.candidate.name,
            email: application.candidate.email,
            phone: application.candidate.phone,
            position: application.job.title,
            department: data.department?.trim() || application.job.department || 'A definir',
            salary: data.salary !== undefined ? String(data.salary) : undefined,
            admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
            contractType: data.contractType,
            workScheduleRuleId: data.workScheduleRuleId,
            observations: notes || undefined,
            status: 'ONBOARDING',
          },
        });

        await tx.employeeAsoRecord.create({
          data: {
            companyId,
            employeeId: employee.id,
            asoType: 'ADMISSIONAL',
            status: preset ? 'SCHEDULED' : 'PENDING',
            clinicName: preset?.name,
            doctorName: preset?.doctorName,
            createdBy: actorId,
          },
        });

        if (application.resumeUrl) {
          await tx.attachment.create({
            data: {
              companyId,
              ownerType: 'EMPLOYEE',
              ownerId: employee.id,
              fileName: application.resumeName || 'curriculo',
              fileType: application.resumeType || 'application/octet-stream',
              fileSize: application.resumeSize || 0,
              fileUrl: `/jobs/applications/${application.id}/resume`,
              storageKey: application.resumeUrl,
              uploadedByUserId: actorId,
            },
          });
        }

        const pipelineId =
          application.stage?.pipelineId ??
          application.job.pipelineId ??
          (await tx.hiringPipeline.findFirst({ where: { companyId, isDefault: true }, select: { id: true } }))?.id;
        const hiredStage = pipelineId
          ? await tx.pipelineStage.findFirst({ where: { pipelineId, kind: 'HIRED' }, orderBy: { position: 'asc' } })
          : null;

        await tx.application.update({
          where: { id: application.id },
          data: { status: 'HIRED', stageId: hiredStage?.id ?? application.stageId, stageMovedAt: new Date(), rejectionReason: null },
        });
        await tx.applicationEvent.create({
          data: {
            applicationId: application.id,
            userId: actorId,
            type: 'HIRED',
            fromStage: application.stage?.name ?? null,
            toStage: hiredStage?.name ?? 'Contratado',
            note: 'Admissão iniciada',
          },
        });
        await tx.candidate.update({ where: { id: application.candidate.id }, data: { status: 'HIRED' } });

        return { employee, alreadyHired: false };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const application = await this.application(companyId, applicationId);
        if (application?.candidate.admittedEmployee) {
          return { employee: application.candidate.admittedEmployee, alreadyHired: true };
        }
      }
      throw error;
    }
  }
}
