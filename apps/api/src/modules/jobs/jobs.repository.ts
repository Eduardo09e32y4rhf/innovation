import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.job.findMany({
      where: { companyId },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
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

  applications(companyId: string, jobId: string) {
    return this.prisma.application.findMany({
      where: { companyId, jobId },
      include: {
        candidate: { include: { admittedEmployee: { select: { id: true, status: true } } } },
        job: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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

  async updateApplicationStatus(companyId: string, id: string, status: any) {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findFirst({ where: { companyId, id } });
      if (!application) return null;
      const candidateStatus = status === 'APPLIED' ? 'NEW' : status;
      await tx.candidate.update({
        where: { id: application.candidateId },
        data: { status: candidateStatus },
      });
      return tx.application.update({ where: { id }, data: { status } });
    });
  }

  async publicCompany(companyKey: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyKey);
    return this.prisma.company.findFirst({
      where: {
        isActive: true,
        status: 'ACTIVE',
        billingStatus: { notIn: ['CANCELED', 'PENDING_PAYMENT'] },
        OR: [
          { slug: companyKey },
          ...(isUuid ? [{ id: companyKey }] : []),
        ],
      },
      select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, city: true, state: true },
    });
  }

  publicJobs(companyId: string) {
    return this.prisma.job.findMany({
      where: { companyId, status: 'OPEN' },
      select: {
        id: true, title: true, description: true, location: true, employmentType: true,
        salaryRange: true, benefits: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  publicJobsCatalog() {
    return this.prisma.job.findMany({
      where: { status: 'OPEN', company: { isActive: true, status: 'ACTIVE', billingStatus: { notIn: ['CANCELED', 'PENDING_PAYMENT'] } } },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        employmentType: true,
        salaryRange: true,
        benefits: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  publicJob(companyId: string, jobId: string) {
    return this.prisma.job.findFirst({
      where: { companyId, id: jobId, status: 'OPEN' },
      select: {
        id: true, title: true, description: true, location: true, employmentType: true,
        salaryRange: true, benefits: true, createdAt: true, updatedAt: true,
      },
    });
  }

  publicJobById(jobId: string) {
    return this.prisma.job.findFirst({
      where: { id: jobId, status: 'OPEN', company: { isActive: true } },
      include: {
        company: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } },
      },
    });
  }

  async allPublicJobs() {
    const jobs = await this.prisma.job.findMany({
      where: {
        status: 'OPEN',
        company: {
          isActive: true,
          status: 'ACTIVE',
          billingStatus: { notIn: ['CANCELED', 'PENDING_PAYMENT'] },
        },
      },
      select: {
        id: true, title: true, description: true, location: true, employmentType: true,
        salaryRange: true, benefits: true, createdAt: true, updatedAt: true,
        companyId: true,
        company: {
          select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, city: true, state: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const companies = await this.prisma.company.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
        billingStatus: { notIn: ['CANCELED', 'PENDING_PAYMENT'] },
      },
      select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, city: true, state: true },
      orderBy: { name: 'asc' },
    });

    return { jobs, companies };
  }

  async apply(companyId: string, jobId: string, data: any, resume: {
    key: string; name: string; type: string; size: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${companyId}:${data.email}`}))`;
      let candidate = await tx.candidate.findFirst({
        where: { companyId, email: { equals: data.email, mode: 'insensitive' } },
      });
      if (!candidate) {
        candidate = await tx.candidate.create({
          data: {
            companyId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            linkedinUrl: data.linkedinUrl,
            coverLetter: data.coverLetter,
            resumeUrl: resume.key,
            resumeName: resume.name,
            resumeType: resume.type,
            resumeSize: resume.size,
            aiScore: data.aiScore,
            aiSummary: data.aiSummary,
            status: 'NEW',
          },
        });
      } else {
        const duplicate = await tx.application.findFirst({
          where: { companyId, candidateId: candidate.id, jobId },
        });
        if (duplicate) return { duplicate: true as const, application: duplicate };
        candidate = await tx.candidate.update({
          where: { id: candidate.id },
          data: {
            name: data.name,
            phone: data.phone,
            linkedinUrl: data.linkedinUrl,
            coverLetter: data.coverLetter,
            resumeUrl: resume.key,
            resumeName: resume.name,
            resumeType: resume.type,
            resumeSize: resume.size,
            aiScore: data.aiScore,
            aiSummary: data.aiSummary,
            status: 'NEW',
          },
        });
      }
      const application = await tx.application.create({
        data: { companyId, candidateId: candidate.id, jobId, status: 'APPLIED' },
      });
      return { duplicate: false as const, application };
    });
  }

  async hire(companyId: string, applicationId: string, actorId: string, data: any) {
    try {
      return await this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findFirst({
        where: { companyId, id: applicationId },
        include: { candidate: { include: { admittedEmployee: true } }, job: true },
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
        application.candidate.aiSummary ? `Triagem: ${application.candidate.aiSummary}` : null,
        application.candidate.coverLetter ? `Apresentação: ${application.candidate.coverLetter}` : null,
      ].filter(Boolean).join('\n\n');

      const employee = await tx.employee.create({
        data: {
          companyId,
          originCandidateId: application.candidate.id,
          name: application.candidate.name,
          email: application.candidate.email,
          phone: application.candidate.phone,
          position: application.job.title,
          department: data.department?.trim() || 'A definir',
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

      if (application.candidate.resumeUrl) {
        await tx.attachment.create({
          data: {
            companyId,
            ownerType: 'EMPLOYEE',
            ownerId: employee.id,
            fileName: application.candidate.resumeName || 'curriculo',
            fileType: application.candidate.resumeType || 'application/octet-stream',
            fileSize: application.candidate.resumeSize || 0,
            fileUrl: `/jobs/applications/${application.id}/resume`,
            storageKey: application.candidate.resumeUrl,
            uploadedByUserId: actorId,
          },
        });
      }

      await tx.application.update({ where: { id: application.id }, data: { status: 'HIRED' } });
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
