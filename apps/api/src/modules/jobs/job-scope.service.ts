import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type Actor = { sub: string; role?: string };

/**
 * Escopo por vaga do RH - R&S: vaga com responsaveis so e visivel a eles; sem responsaveis, a toda a equipe de R&S.
 * Os demais perfis de recrutamento (DEV, ADMIN, RH, GESTOR) enxergam toda a empresa.
 */
export function jobScopeWhere(actor: Actor): Prisma.JobWhereInput {
  if (actor.role !== 'RH_RS') return {};
  return { OR: [{ recruiters: { none: {} } }, { recruiters: { some: { userId: actor.sub } } }] };
}

const ASSIGNABLE_ROLES = ['RH_RS', 'RH'];

@Injectable()
export class JobScopeService {
  constructor(private readonly prisma: PrismaService) {}

  scope(actor: Actor) {
    return jobScopeWhere(actor);
  }

  /** 404 tanto para vaga inexistente quanto fora da empresa ou do escopo do ator. */
  async assertJob(companyId: string, actor: Actor, jobId: string) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId, ...jobScopeWhere(actor) }, select: { id: true } });
    if (!job) throw new NotFoundException('Vaga nao encontrada.');
  }

  async assertApplication(companyId: string, actor: Actor, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, companyId, job: { is: { companyId, ...jobScopeWhere(actor) } } },
      select: { id: true },
    });
    if (!application) throw new NotFoundException('Candidatura nao encontrada.');
  }

  /** O criador RH_RS passa a ser responsavel da propria vaga (senao ela ficaria aberta a toda a equipe de R&S). */
  async assignCreator(companyId: string, actor: Actor, jobId: string) {
    if (actor.role !== 'RH_RS') return;
    await this.prisma.jobRecruiter.create({ data: { companyId, jobId, userId: actor.sub, assignedById: actor.sub } });
  }

  async listRecruiters(companyId: string, actor: Actor, jobId: string) {
    await this.assertJob(companyId, actor, jobId);
    const rows = await this.prisma.jobRecruiter.findMany({
      where: { jobId, companyId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({ userId: row.userId, name: row.user.name, role: row.user.role, assignedAt: row.createdAt }));
  }

  /** Substitui a lista de responsaveis. So usuarios ativos da mesma empresa com perfil de recrutamento. */
  async setRecruiters(companyId: string, actor: Actor, jobId: string, userIds: string[]) {
    await this.assertJob(companyId, actor, jobId);
    const unique = [...new Set(userIds)];
    if (unique.length) {
      const valid = await this.prisma.user.findMany({
        where: { id: { in: unique }, companyId, isActive: true, role: { in: ASSIGNABLE_ROLES as any } },
        select: { id: true },
      });
      if (valid.length !== unique.length) throw new BadRequestException('Todos os responsaveis precisam ser usuarios ativos da empresa com perfil RH ou RH - R&S.');
    }
    await this.prisma.$transaction([
      this.prisma.jobRecruiter.deleteMany({ where: { jobId, companyId } }),
      ...(unique.length
        ? [this.prisma.jobRecruiter.createMany({ data: unique.map((userId) => ({ companyId, jobId, userId, assignedById: actor.sub })) })]
        : []),
    ]);
    return this.listRecruiters(companyId, actor, jobId);
  }
}