import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { DelegateJobDto } from './dto/delegate-job.dto';

/** Perfis da empresa-freelancer que enxergam toda vaga delegada, sem precisar de grant individual. */
const FREELANCER_BROAD_VISIBILITY_ROLES = ['DEV', 'ADMIN', 'GESTOR', 'RH'];

/**
 * Recrutador freelancer: contrato (FreelancerEngagement) entre duas empresas e delegacao explicita de vaga
 * (JobDelegation). Isto e a UNICA porta de entrada cross-tenant do modulo de recrutamento: o isolamento por
 * companyId de Job/Application nunca e relaxado — o freelancer so chega a uma vaga atraves de uma linha de
 * JobDelegation com status ACTIVE, nunca pelo filtro geral usado pelo resto do modulo (ver job-scope.service.ts).
 */
@Injectable()
export class FreelancerEngagementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(freelancerCompanyId: string, actor: JwtUser, dto: CreateEngagementDto) {
    const client = await this.prisma.company.findFirst({
      where: { document: dto.clientCompanyDocument },
      select: { id: true, name: true },
    });
    if (!client) throw new NotFoundException('Nenhuma empresa cadastrada na plataforma com este CPF/CNPJ.');
    if (client.id === freelancerCompanyId) throw new BadRequestException('Nao e possivel criar um contrato com a propria empresa.');

    const data = {
      scope: dto.scope,
      contractedPositions: dto.contractedPositions,
      positionValue: dto.positionValue,
      signupFee: dto.signupFee,
      monthlyFee: dto.monthlyFee,
      warrantyDays: dto.warrantyDays ?? 90,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
    };

    const existing = await this.prisma.freelancerEngagement.findUnique({
      where: { freelancerCompanyId_clientCompanyId: { freelancerCompanyId, clientCompanyId: client.id } },
    });
    if (existing) {
      if (existing.status === 'NEGOTIATION' || existing.status === 'ACTIVE') {
        throw new BadRequestException('Ja existe um contrato ativo ou em negociacao com esta empresa.');
      }
      // Contrato encerrado/inativo: reabre como nova negociacao em vez de duplicar a linha (chave unica por par de empresas).
      return this.prisma.freelancerEngagement.update({
        where: { id: existing.id },
        data: { ...data, status: 'NEGOTIATION', startedAt: null, endedAt: null, createdById: actor.sub },
      });
    }

    return this.prisma.freelancerEngagement.create({
      data: { ...data, freelancerCompanyId, clientCompanyId: client.id, status: 'NEGOTIATION', createdById: actor.sub },
    });
  }

  async list(actor: JwtUser) {
    const rows = await this.prisma.freelancerEngagement.findMany({
      where: { OR: [{ freelancerCompanyId: actor.companyId }, { clientCompanyId: actor.companyId }] },
      include: {
        freelancerCompany: { select: { id: true, name: true, document: true } },
        clientCompany: { select: { id: true, name: true, document: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({ ...row, myRole: row.freelancerCompanyId === actor.companyId ? ('FREELANCER' as const) : ('CLIENT' as const) }));
  }

  /** 404 tanto para contrato inexistente quanto fora do lado permitido — nao revela que o contrato existe para terceiros. */
  private async getOwned(engagementId: string, actor: JwtUser, side: 'freelancer' | 'client' | 'either') {
    const engagement = await this.prisma.freelancerEngagement.findUnique({ where: { id: engagementId } });
    if (!engagement) throw new NotFoundException('Contrato nao encontrado.');
    const isFreelancer = engagement.freelancerCompanyId === actor.companyId;
    const isClient = engagement.clientCompanyId === actor.companyId;
    const allowed = side === 'freelancer' ? isFreelancer : side === 'client' ? isClient : isFreelancer || isClient;
    if (!allowed) throw new NotFoundException('Contrato nao encontrado.');
    return engagement;
  }

  /** Apenas a empresa-cliente aceita o contrato proposto pelo freelancer. */
  async accept(engagementId: string, actor: JwtUser) {
    const engagement = await this.getOwned(engagementId, actor, 'client');
    if (engagement.status !== 'NEGOTIATION') throw new BadRequestException('Contrato nao esta em negociacao.');
    return this.prisma.freelancerEngagement.update({ where: { id: engagementId }, data: { status: 'ACTIVE', startedAt: new Date() } });
  }

  async end(engagementId: string, actor: JwtUser) {
    const engagement = await this.getOwned(engagementId, actor, 'either');
    if (engagement.status === 'ENDED') return engagement;
    return this.prisma.freelancerEngagement.update({ where: { id: engagementId }, data: { status: 'ENDED', endedAt: new Date() } });
  }

  /** So a empresa-cliente delega uma vaga PROPRIA a um contrato ativo com o freelancer. */
  async delegateJob(engagementId: string, actor: JwtUser, dto: DelegateJobDto) {
    const engagement = await this.getOwned(engagementId, actor, 'client');
    if (engagement.status !== 'ACTIVE') throw new BadRequestException('O contrato precisa estar ativo para delegar vagas.');

    const job = await this.prisma.job.findFirst({ where: { id: dto.jobId, companyId: actor.companyId }, select: { id: true } });
    if (!job) throw new NotFoundException('Vaga nao encontrada.');

    const existingDelegation = await this.prisma.jobDelegation.findUnique({ where: { jobId: dto.jobId } });
    if (existingDelegation) {
      if (existingDelegation.status === 'ACTIVE') throw new BadRequestException('Esta vaga ja esta delegada a um freelancer.');
      return this.prisma.jobDelegation.update({
        where: { id: existingDelegation.id },
        data: {
          engagementId,
          freelancerCompanyId: engagement.freelancerCompanyId,
          status: 'ACTIVE',
          delegatedById: actor.sub,
          revokedAt: null,
          revokedById: null,
          warrantyEndsAt: null,
        },
      });
    }

    return this.prisma.jobDelegation.create({
      data: { engagementId, jobId: dto.jobId, clientCompanyId: actor.companyId, freelancerCompanyId: engagement.freelancerCompanyId, delegatedById: actor.sub },
    });
  }

  /** So a empresa-cliente (dona da vaga) revoga a delegacao. */
  async revokeDelegation(delegationId: string, actor: JwtUser) {
    const delegation = await this.prisma.jobDelegation.findFirst({ where: { id: delegationId, clientCompanyId: actor.companyId } });
    if (!delegation) throw new NotFoundException('Delegacao nao encontrada.');
    return this.prisma.jobDelegation.update({ where: { id: delegationId }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actor.sub } });
  }

  /** Confirma a contratacao: liga a contagem da garantia contratual (warrantyDays do contrato). So o cliente confirma. */
  async markHired(delegationId: string, actor: JwtUser) {
    const delegation = await this.prisma.jobDelegation.findFirst({
      where: { id: delegationId, clientCompanyId: actor.companyId },
      include: { engagement: { select: { warrantyDays: true } } },
    });
    if (!delegation) throw new NotFoundException('Delegacao nao encontrada.');
    const warrantyEndsAt = new Date(Date.now() + delegation.engagement.warrantyDays * 24 * 60 * 60 * 1000);
    return this.prisma.jobDelegation.update({ where: { id: delegationId }, data: { warrantyEndsAt } });
  }

  /** So a empresa-freelancer escolhe quais dos SEUS usuarios atuam em cada vaga delegada. */
  async setDelegationGrants(delegationId: string, actor: JwtUser, userIds: string[]) {
    const delegation = await this.prisma.jobDelegation.findFirst({ where: { id: delegationId, freelancerCompanyId: actor.companyId } });
    if (!delegation) throw new NotFoundException('Delegacao nao encontrada.');

    const unique = [...new Set(userIds)];
    if (unique.length) {
      const valid = await this.prisma.user.findMany({ where: { id: { in: unique }, companyId: actor.companyId, isActive: true }, select: { id: true } });
      if (valid.length !== unique.length) throw new BadRequestException('Todos os usuarios precisam ser ativos da sua empresa.');
    }

    await this.prisma.$transaction([
      this.prisma.jobDelegationGrant.deleteMany({ where: { delegationId } }),
      ...(unique.length ? [this.prisma.jobDelegationGrant.createMany({ data: unique.map((userId) => ({ delegationId, userId })) })] : []),
    ]);
    return this.listGrants(delegationId);
  }

  async listGrants(delegationId: string) {
    const rows = await this.prisma.jobDelegationGrant.findMany({
      where: { delegationId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({ userId: row.userId, name: row.user.name, role: row.user.role, grantedAt: row.createdAt }));
  }

  /** Limite de visibilidade cross-tenant do freelancer: perfis amplos veem tudo delegado; os demais, so com grant. */
  private delegationVisibilityWhere(actor: JwtUser) {
    const base = { freelancerCompanyId: actor.companyId, status: 'ACTIVE' as const };
    if (FREELANCER_BROAD_VISIBILITY_ROLES.includes(actor.role)) return base;
    return { ...base, grants: { some: { userId: actor.sub } } };
  }

  async listDelegatedJobs(actor: JwtUser) {
    const delegations = await this.prisma.jobDelegation.findMany({
      where: this.delegationVisibilityWhere(actor),
      include: { job: true, clientCompany: { select: { id: true, name: true, document: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return delegations.map((d) => ({ delegationId: d.id, job: d.job, clientCompany: d.clientCompany, warrantyEndsAt: d.warrantyEndsAt, status: d.status }));
  }

  /** 404 se a vaga nao existir OU nao estiver delegada (ativamente) ao freelancer do ator (com grant, se exigido). */
  async assertDelegatedJob(actor: JwtUser, jobId: string) {
    const delegation = await this.prisma.jobDelegation.findFirst({ where: { jobId, ...this.delegationVisibilityWhere(actor) } });
    if (!delegation) throw new NotFoundException('Vaga nao encontrada ou nao delegada a voce.');
    return delegation;
  }

  async getDelegatedJob(actor: JwtUser, jobId: string) {
    const delegation = await this.assertDelegatedJob(actor, jobId);
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { applications: { include: { candidate: true }, orderBy: { createdAt: 'desc' } } },
    });
    return { delegation, job };
  }

  /** Participacao do freelancer no processo sem tocar no motor de pipeline/automacoes (fora do escopo deste passo). */
  async addApplicationNote(actor: JwtUser, applicationId: string, body: string) {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId }, select: { id: true, jobId: true } });
    if (!application) throw new NotFoundException('Candidatura nao encontrada.');
    await this.assertDelegatedJob(actor, application.jobId);
    return this.prisma.applicationNote.create({ data: { applicationId, userId: actor.sub, authorName: actor.name ?? null, body } });
  }
}
