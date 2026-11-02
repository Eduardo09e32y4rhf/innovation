import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { jobLifecycle, outdatedFields, reportedChanges } from './job-lifecycle';
import { normalizeAnswerValue, validateAnswerShape, type RuleQuestion } from './recruitment-rules';
import { RecruitmentService } from './recruitment.service';

const RECRUITER_ROLES = ['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR'];
const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

/**
 * Sem os decorators o ValidationPipe global (whitelist + forbidNonWhitelisted) recusava TODOS os campos
 * ("property registration should not exist"): a candidatura interna nao funcionava.
 */
export class InternalApplyDto {
  @IsString() @MaxLength(40) registration!: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(240) email?: string;
  @IsOptional() @IsString() @MaxLength(3000) coverLetter?: string;
}

/** Link publico da vaga interna: o funcionario prova quem e com matricula + CPF (os dois precisam bater). */
export class PublicInternalApplyDto extends InternalApplyDto {
  @IsString() @MaxLength(20) cpf!: string;
  @IsOptional() @IsObject() answers?: Record<string, unknown>;
  @IsBoolean() consent!: boolean;
  @IsOptional() @IsString() @MaxLength(2048) turnstileToken?: string;
}

/**
 * Processo interno: o funcionário se candidata pela matrícula e o sistema preenche tudo com o cadastro dele.
 * Se o cadastro estiver incompleto ou velho, o RH é avisado (a candidatura não trava).
 */
@Injectable()
export class InternalJobsService {
  private readonly logger = new Logger(InternalJobsService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly recruitment: RecruitmentService) {}

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

  // ---------- link publico da vaga interna ----------
  private async publicJobRow(jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, isInternal: true, company: { isActive: true, status: 'ACTIVE', billingStatus: { notIn: ['CANCELED', 'PENDING_PAYMENT'] }, activeModules: { has: 'recruitment' } } },
      select: {
        id: true, companyId: true, title: true, description: true, department: true, location: true, workMode: true, seniority: true, employmentType: true, requirements: true, benefits: true,
        openings: true, deadline: true, salaryRange: true, salaryMin: true, salaryMax: true, salaryHidden: true, status: true, closedAt: true, updatedAt: true, pipelineId: true, screeningMinScore: true, screeningAction: true,
        company: { select: { name: true, logoUrl: true, primaryColor: true } },
        questions: { select: { id: true, label: true, type: true, required: true, options: true, knockout: true, scoreRule: true }, orderBy: { position: 'asc' } },
      },
    });
    if (!job) throw new NotFoundException('Vaga interna não encontrada.');
    return job;
  }

  /** Pagina publica da vaga interna (sem regras de triagem nem dados internos). */
  async publicJob(jobId: string) {
    const job = await this.publicJobRow(jobId);
    const { companyId: _c, pipelineId: _p, screeningMinScore: _m, screeningAction: _a, questions, salaryHidden, salaryMin, salaryMax, salaryRange, status: _s, closedAt: _cl, updatedAt: _u, ...rest } = job;
    return {
      ...rest,
      salaryRange: salaryHidden ? null : salaryRange, salaryMin: salaryHidden ? null : salaryMin, salaryMax: salaryHidden ? null : salaryMax, salaryHidden,
      acceptsApplications: jobLifecycle(job).acceptsApplications,
      questions: questions.map(({ knockout: _k, scoreRule: _r, ...question }) => question),
    };
  }

  /** Candidatura pelo link: so funcionario ativo da propria empresa, com matricula E CPF conferindo. */
  async applyPublic(jobId: string, dto: PublicInternalApplyDto) {
    if (!dto.consent) throw new BadRequestException('É preciso aceitar o uso dos dados para este processo.');
    const job = await this.publicJobRow(jobId);
    if (!jobLifecycle(job).acceptsApplications) throw new BadRequestException('Esta vaga não está recebendo candidaturas.');
    const registration = String(dto.registration ?? '').trim();
    const cpf = String(dto.cpf ?? '').replace(/\D/g, '');
    if (!registration || cpf.length !== 11) throw new BadRequestException('Informe sua matrícula e o CPF completo.');
    const candidates = await this.prisma.employee.findMany({
      where: { companyId: job.companyId, registration: { equals: registration, mode: 'insensitive' }, status: { in: ['ACTIVE', 'ONBOARDING'] } },
      select: { id: true, name: true, email: true, phone: true, cpf: true, registration: true, cep: true, street: true, streetNumber: true, neighborhood: true, city: true, state: true, education: true, birthDate: true, updatedAt: true },
      take: 3,
    });
    const employee = candidates.find((row) => String(row.cpf ?? '').replace(/\D/g, '') === cpf);
    // Mesma mensagem para matricula inexistente e CPF errado: nao revela quem trabalha na empresa.
    if (!employee) throw new BadRequestException('Matrícula e CPF não conferem com um funcionário ativo desta empresa. Confira os dados ou procure o RH.');

    const questions: RuleQuestion[] = job.questions.map((question) => ({ ...question, options: question.options ?? [] }));
    const answers = new Map<string, string>();
    for (const question of questions) {
      const value = normalizeAnswerValue(question, dto.answers?.[question.id]);
      const problem = validateAnswerShape(question, value);
      if (problem) throw new BadRequestException(problem);
      if (value) answers.set(question.id, value);
    }
    const evaluation = await this.recruitment.evaluateApplication(questions, answers, { minScore: job.screeningMinScore, action: job.screeningAction });
    const email = (employee.email ?? dto.email ?? '').trim().toLowerCase();
    if (!email) throw new BadRequestException('Seu cadastro não tem e-mail. Informe um e-mail para contato.');

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${job.companyId}:${email}`}))`;
      let candidate = await tx.candidate.findFirst({ where: { companyId: job.companyId, email: { equals: email, mode: 'insensitive' } } });
      if (!candidate) candidate = await tx.candidate.create({ data: { companyId: job.companyId, name: employee.name, email, phone: employee.phone ?? dto.phone, status: 'NEW' } });
      const duplicate = await tx.application.findFirst({ where: { companyId: job.companyId, candidateId: candidate.id, jobId } });
      if (duplicate) return { duplicate: true as const };
      const pipelineId = job.pipelineId ?? (await tx.hiringPipeline.findFirst({ where: { companyId: job.companyId, isDefault: true }, select: { id: true } }))?.id ?? null;
      const stages = pipelineId ? await tx.pipelineStage.findMany({ where: { pipelineId }, orderBy: { position: 'asc' } }) : [];
      const first = stages.find((stage) => stage.kind === 'APPLIED') ?? stages[0];
      const rejected = stages.find((stage) => stage.kind === 'REJECTED');
      const autoReject = evaluation.knockedOut && evaluation.reject && rejected;
      const application = await tx.application.create({
        data: {
          companyId: job.companyId, candidateId: candidate.id, jobId, status: autoReject ? 'REJECTED' : 'APPLIED', source: 'INTERNAL', employeeId: employee.id,
          coverLetter: dto.coverLetter?.trim() || null, consentGiven: true, consentAt: new Date(), stageId: (autoReject ? rejected : first)?.id, stageMovedAt: new Date(),
          score: evaluation.scored ? evaluation.score : null, knockedOut: evaluation.knockedOut, knockoutReason: evaluation.reason, rejectionReason: autoReject ? evaluation.reason : null,
          answers: answers.size ? { create: [...answers].map(([questionId, value]) => ({ questionId, value })) } : undefined,
          events: { create: [
            { type: 'APPLIED', toStage: first?.name ?? null, note: `Candidatura interna pelo link (matrícula ${employee.registration}, CPF conferido)` },
            ...(autoReject ? [{ type: 'REJECTED', fromStage: first?.name ?? null, toStage: rejected!.name, note: evaluation.reason }] : []),
          ] },
        },
      });
      return { duplicate: false as const, applicationId: application.id };
    });
    if (result.duplicate) throw new ConflictException('Você já se candidatou a esta vaga.');
    const outdated = outdatedFields(employee);
    if (outdated.length) {
      try {
        await this.notifications.createSystemNotice(job.companyId, {
          title: `Cadastro para atualizar: ${employee.name}`,
          message: `${employee.name} (matrícula ${employee.registration}) se candidatou à vaga interna "${job.title}". Dados faltando ou antigos: ${outdated.join(', ')}.`,
          priority: 'LOW', targetRoles: ['RH', 'ADMIN'], extraJson: { kind: 'EMPLOYEE_DATA_OUTDATED', employeeId: employee.id, jobId, missing: outdated },
        });
      } catch (cause: any) { this.logger.warn(`Aviso ao RH não enviado: ${cause?.message}`); }
    }
    return { received: true, name: employee.name.split(' ')[0] };
  }
}
