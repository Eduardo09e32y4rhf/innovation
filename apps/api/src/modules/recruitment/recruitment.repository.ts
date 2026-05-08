import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RecruitmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  ensureCompany(companyId: string) {
    return this.prisma.company.upsert({
      where: { id: companyId },
      create: {
        id: companyId,
        name: 'Innovation IA',
      },
      update: {},
    });
  }

  listJobs(companyId: string) {
    return this.prisma.job.findMany({
      where: { companyId },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listPublicJobs(companyId: string) {
    return this.prisma.job.findMany({
      where: { companyId, status: 'OPEN' },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createJob(companyId: string, data: any) {
    return this.prisma.job.create({ data: { ...data, company: { connect: { id: companyId } } } });
  }

  async getJob(companyId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { companyId, id },
      include: { _count: { select: { applications: true } } },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async getPublicJob(companyId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { companyId, id, status: 'OPEN' },
      include: { _count: { select: { applications: true } } },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async updateJob(companyId: string, id: string, data: any) {
    const result = await this.prisma.job.updateMany({ where: { companyId, id }, data });
    if (!result.count) throw new NotFoundException('Job not found');
    return this.getJob(companyId, id);
  }

  async deleteJob(companyId: string, id: string) {
    const result = await this.prisma.job.deleteMany({ where: { companyId, id } });
    if (!result.count) throw new NotFoundException('Job not found');
    return { deleted: true };
  }

  listCandidates(companyId: string) {
    return this.prisma.candidate.findMany({
      where: { companyId },
      include: {
        applications: {
          include: { job: true },
          orderBy: { createdAt: 'desc' },
        },
        contact: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCandidate(companyId: string, data: any) {
    return this.prisma.candidate.create({ data: { ...data, company: { connect: { id: companyId } } } });
  }

  async findCandidateForPublicApplication(companyId: string, email: string, phone?: string) {
    return this.prisma.candidate.findFirst({
      where: {
        companyId,
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
      include: {
        applications: true,
        contact: true,
      },
    });
  }

  async getCandidate(companyId: string, id: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { companyId, id },
      include: {
        applications: {
          include: { job: true },
          orderBy: { createdAt: 'desc' },
        },
        contact: true,
      },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async updateCandidate(companyId: string, id: string, data: any) {
    const result = await this.prisma.candidate.updateMany({ where: { companyId, id }, data });
    if (!result.count) throw new NotFoundException('Candidate not found');
    return this.getCandidate(companyId, id);
  }

  async deleteCandidate(companyId: string, id: string) {
    const result = await this.prisma.candidate.deleteMany({ where: { companyId, id } });
    if (!result.count) throw new NotFoundException('Candidate not found');
    return { deleted: true };
  }

  listApplications(companyId: string) {
    return this.prisma.application.findMany({
      where: { companyId },
      include: { candidate: true, job: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApplication(companyId: string, id: string) {
    const application = await this.prisma.application.findFirst({
      where: { companyId, id },
      include: { candidate: true, job: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  async createApplication(companyId: string, candidateId: string, jobId: string) {
    await this.getCandidate(companyId, candidateId);
    await this.getJob(companyId, jobId);
    const existing = await this.prisma.application.findUnique({
      where: { companyId_candidateId_jobId: { companyId, candidateId, jobId } },
    });
    if (existing) throw new ConflictException('Candidate already applied to this job');
    return this.prisma.application.create({ data: { companyId, candidateId, jobId } });
  }

  async updateApplicationStatus(companyId: string, id: string, status: string) {
    const result = await this.prisma.application.updateMany({ where: { companyId, id }, data: { status } as any });
    if (!result.count) throw new NotFoundException('Application not found');
    return this.prisma.application.findFirst({ where: { companyId, id }, include: { candidate: true, job: true } });
  }

  async updateCandidateStatus(companyId: string, id: string, status: string) {
    const result = await this.prisma.candidate.updateMany({ where: { companyId, id }, data: { status } as any });
    if (!result.count) throw new NotFoundException('Candidate not found');
    return this.getCandidate(companyId, id);
  }

  upsertCandidateContact(companyId: string, phone: string | undefined, candidateName: string, email?: string) {
    if (!phone) return Promise.resolve(null);
    const normalizedPhone = phone.replace(/\D/g, '');
    return this.prisma.contact.upsert({
      where: { companyId_phone: { companyId, phone: normalizedPhone } },
      create: {
        companyId,
        phone: normalizedPhone,
        name: candidateName,
        email,
      },
      update: {
        name: candidateName,
        email: email ?? undefined,
      },
    });
  }
}
