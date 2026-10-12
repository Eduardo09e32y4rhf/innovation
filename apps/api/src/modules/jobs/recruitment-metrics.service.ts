import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { computeMetrics, type MetricApp } from './recruitment-metrics';

const rank = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

@Injectable()
export class RecruitmentMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(companyId: string, jobScope: Prisma.JobWhereInput, query: { from?: string; to?: string; jobId?: string }) {
    const to = query.to ? new Date(`${query.to}T23:59:59Z`) : new Date();
    const from = query.from ? new Date(`${query.from}T00:00:00Z`) : new Date(to.getTime() - 180 * 86_400_000);
    const jobWhere: Prisma.JobWhereInput = { AND: [{ companyId }, jobScope, ...(query.jobId ? [{ id: query.jobId }] : [])] };
    const [stages, rows, jobs] = await Promise.all([
      this.prisma.pipelineStage.findMany({ where: { pipeline: { companyId } }, select: { name: true, kind: true } }),
      this.prisma.application.findMany({
        where: { companyId, createdAt: { gte: from, lte: to }, job: { is: jobWhere } },
        select: { id: true, jobId: true, createdAt: true, status: true, source: true, rejectionCode: true, events: { select: { type: true, fromStage: true, toStage: true, userId: true, createdAt: true }, orderBy: { createdAt: 'asc' } } },
        take: 5000,
      }),
      this.prisma.job.findMany({ where: jobWhere, select: { id: true, title: true, createdAt: true, recruiters: { select: { userId: true } } } }),
    ]);
    const kindOf = new Map<string, string>(); for (const stage of stages) if (!kindOf.has(stage.name)) kindOf.set(stage.name, stage.kind);

    const apps: MetricApp[] = rows.map((row) => {
      const reached = new Set<string>();
      for (const event of row.events) { const kind = event.toStage ? kindOf.get(event.toStage) : undefined; if (kind) reached.add(kind); }
      const top = rank.indexOf(row.status); if (top > 0) for (let i = 1; i <= top; i++) reached.add(rank[i]);
      const hiredEvent = row.events.find((event) => event.type === 'HIRED');
      const rejected = [...row.events].reverse().find((event) => event.type === 'REJECTED');
      return { id: row.id, jobId: row.jobId, createdAt: row.createdAt, status: row.status, source: row.source, rejectionCode: row.rejectionCode, reachedKinds: [...reached], hiredAt: hiredEvent?.createdAt ?? null, rejectedFromKind: rejected?.fromStage ? kindOf.get(rejected.fromStage) ?? null : null };
    });

    const ids = rows.map((row) => row.id);
    const diversity = ids.length ? await this.prisma.candidateDiversity.findMany({ where: { applicationId: { in: ids } }, select: { gender: true, race: true, pcd: true } }) : [];
    const result = computeMetrics({ apps, jobs, diversity });

    // Produtividade por recrutador: movimentações registradas (etapa, reprovação, contratação) e contratações feitas.
    const actions = new Map<string, { moves: number; hires: number }>();
    for (const row of rows) for (const event of row.events) {
      if (!event.userId || !['STAGE_CHANGED', 'REJECTED', 'HIRED'].includes(event.type)) continue;
      const entry = actions.get(event.userId) ?? { moves: 0, hires: 0 }; entry.moves++; if (event.type === 'HIRED') entry.hires++; actions.set(event.userId, entry);
    }
    const users = actions.size ? await this.prisma.user.findMany({ where: { id: { in: [...actions.keys()] } }, select: { id: true, name: true } }) : [];
    const recruiters = [...actions.entries()].map(([userId, value]) => ({ userId, name: users.find((user) => user.id === userId)?.name ?? 'Usuário', jobsAssigned: jobs.filter((job) => job.recruiters.some((r) => r.userId === userId)).length, ...value })).sort((a, b) => b.moves - a.moves);

    return { period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }, ...result, recruiters, jobs: jobs.map((job) => ({ id: job.id, title: job.title })) };
  }
}