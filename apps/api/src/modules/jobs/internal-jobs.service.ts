import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { jobLifecycle, outdatedFields, reportedChanges } from './job-lifecycle';

const RECRUITER_ROLES = ['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR'];
const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

export class InternalApplyDto { registration!: string; phone?: string; email?: string; coverLetter?: string }

/**
 * Processo interno: o funcionário se candidata pela matrícula e o sistema preenche tudo com o cadastro dele.
 * Se o cadastro estiver incompleto ou velho, o RH é avisado (a candidatura não trava).
 */
@Injectable()
export class InternalJobsService {
  private readonly logger = new Logger(InternalJobsService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  private isRecruiter(actor: JwtUser) { return RECRUITER_ROLES.includes(actor.role); }

  /** Vagas internas abertas (para o funcionário ver e se candidatar). */
  async openJobs(companyId: string, actor: JwtUser) {
    const me = await this.prisma.employee.findFirst({ where: { companyId, userId: actor.sub }, select: { id: true } });
    const jobs = await this.prisma.job.findMany({
      where: { companyId, isInternal: true, status: 'OPEN', OR: [{ deadline: null }, { deadline: { gte: new Date() } }] },
      select: { id: true, title: true, description: true, department: true, location: true, workMode: true, seniority: true, employmentType: true, requirements: true, benefits: true, openings: true, deadline: true, salaryRange: true, salaryHidden: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const applied = me ? await this.prisma.application.findMany({ where: { companyId, employeeId: me.id, jobId: { in: jobs.map((j) => j.id) } }, select: { jobId: true } }) : [];
    const done = new Set(applied.map((a) => a.jobId));
    return jobs.map((j) => ({ ...j, salaryRange: j.salaryHidden ? null : j.salaryRange, alreadyApplied: done.has(j.id) }));
  }

  /** Dados do cadastro pela matrícula. Funcionário só consulta a própria; RH/Gestor/R&S qualquer um da empresa. */
  async lookup(companyId: string, actor: JwtUser, registration: string) {
    const code = String(registration ?? '').trim();
    if (!code) throw new BadRequestException('Informe a matrícula.');
    const matches = await this.prisma.employee.findMany({
      where: { companyId, registration: { equals: code, mode: 'insensitive' }, status: { in: ['ACTIVE', 'ONBOARDING'] } },
      select: { id: true, userId: true, name: true, email: true, phone: true, secondaryPhone: true, cpf: true, birthDate: true, position: true, department: true, unit: true, admissionDate: true, registration: true, managerId: true, cep: true, street: true, streetNumber: true, neighborhood: true, city: true, state: true, bankAccount: true, education: true, updatedAt: true },
      take: 3,
    });
    if (matches.length === 0) throw new NotFoundException('Não encontramos essa matrícula entre os funcionários ativos. Confira o número.');
    if (matches.length > 1) throw new BadRequestException('Há mais de um funcionário com essa matrícula. Procure o RH para corrigir o cadastro.');
    const e = matches[0];
    if (!this.isRecruiter(actor) && e.userId !== actor.sub) throw new ForbiddenException('Você só pode usar a sua própria matrícula.');
    const cpf = e.cpf ? `${e.cpf.slice(0, 3)}.***.***-${e.cpf.slice(-2)}` : null;
    return {
      employeeId: e.id, registration: e.registration, name: e.name, email: e.email, phone: e.phone, secondaryPhone: e.secondaryPhone, cpf,
      birthDate: e.birthDate, position: e.position, department: e.department, unit: e.unit, admissionDate: e.admissionDate, education: e.education,
      address: [e.street, e.streetNumber, e.neighborhood, e.city, e.state].filter(Boolean).join(', ') || null,
      outdated: outdatedFields(e),
    };
  }

  async apply(companyId: string, actor: JwtUser, jobId: string, dto: InternalApplyDto) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true, title: true, isInternal: true, status: true, closedAt: true, updatedAt: true, deadline: true, pipelineId: true } });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    if (!job.isInternal) throw new BadRequestException('Esta vaga não é de processo interno.');
    if (!jobLifecycle(job).acceptsApplications) throw new BadRequestException('Esta vaga não está recebendo candidaturas.');
    const data = await this.lookup(companyId, actor, dto.registration);
    const employee = await this.prisma.employee.findFirst({ where: { id: data.employeeId, companyId }, select: { id: true, name: true, email: true, phone: true, userId: true } });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');
    const email = (employee.email ?? dto.email ?? '').trim().toLowerCase();
    if (!email) throw new BadRequestException('O cadastro não tem e-mail. Informe um e-mail para contato.');

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${companyId}:${email}`}))`;
      let candidate = await tx.candidate.findFirst({ where: { companyId, email: { equals: email, mode: 'insensitive' } } });
      if (!candidate) candidate = await tx.candidate.create({ data: { companyId, name: employee.name, email, phone: employee.phone ?? dto.phone, status: 'NEW' } });
      const duplicate = await tx.application.findFirst({ where: { companyId, candidateId: candidate.id, jobId } });
      if (duplicate) return { duplicate: true as const };
      const pipelineId = job.pipelineId ?? (await tx.hiringPipeline.findFirst({ where: { companyId, isDefault: true }, select: { id: true } }))?.id ?? null;
      const stages = pipelineId ? await tx.pipelineStage.findMany({ where: { pipelineId }, orderBy: { position: 'asc' } }) : [];
      const first = stages.find((s) => s.kind === 'APPLIED') ?? stages[0];
      const application = await tx.application.create({
        data: {
          companyId, candidateId: candidate.id, jobId, status: 'APPLIED', source: 'INTERNAL', employeeId: employee.id,
          coverLetter: dto.coverLetter?.trim() || null, consentGiven: true, consentAt: new Date(), stageId: first?.id, stageMovedAt: new Date(),
          events: { create: [{ type: 'APPLIED', toStage: first?.name ?? null, note: `Candidatura interna (matrícula ${data.registration})` }] },
        },
      });
      return { duplicate: false as const, applicationId: application.id };
    });
    if (result.duplicate) throw new ConflictException('Esta pessoa já se candidatou a esta vaga.');

    // Cadastro desatualizado ou dados novos informados: avisa o RH (a candidatura segue normalmente).
    const current = await this.prisma.employee.findFirst({ where: { id: employee.id }, select: { phone: true, email: true } });
    const changes = reportedChanges({ phone: current?.phone, email: current?.email }, { phone: dto.phone, email: dto.email });
    if (data.outdated.length || changes.length) {
      try {
        await this.notifications.createSystemNotice(companyId, {
          title: `Cadastro para atualizar: ${employee.name}`,
          message: `${employee.name} (matrícula ${data.registration}) se candidatou à vaga interna "${job.title}".${data.outdated.length ? ` Dados faltando ou antigos: ${data.outdated.join(', ')}.` : ''}${changes.length ? ` Informou agora: ${changes.join('; ')}.` : ''} Confira e atualize o cadastro em Funcionários.`,
          priority: 'LOW', targetRoles: ['RH', 'ADMIN'], extraJson: { kind: 'EMPLOYEE_DATA_OUTDATED', employeeId: employee.id, jobId, missing: data.outdated, informed: changes },
        });
      } catch (cause: any) { this.logger.warn(`Aviso ao RH não enviado: ${cause?.message}`); }
    }
    return { received: true, applicationId: result.applicationId, rhNotified: Boolean(data.outdated.length || changes.length) };
  }
}
