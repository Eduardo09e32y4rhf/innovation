import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { buildCsv } from '../../common/utils/csv';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { computeMetrics, type MetricApp } from './recruitment-metrics';
import { pcdQuota } from './pcd-quota';
import { computeCosts, noShowRate } from './recruitment-costs';
import { computeStageSla } from './recruitment-sla';

const num = (value: { toString(): string } | number | null | undefined) => (value == null ? null : Number(value.toString()));

const rank = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

@Injectable()
export class RecruitmentMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(companyId: string, jobScope: Prisma.JobWhereInput, query: { from?: string; to?: string; jobId?: string }, opts: { includeCosts?: boolean } = {}) {
    const to = query.to ? new Date(`${query.to}T23:59:59Z`) : new Date();
    const from = query.from ? new Date(`${query.from}T00:00:00Z`) : new Date(to.getTime() - 180 * 86_400_000);
    const jobWhere: Prisma.JobWhereInput = { AND: [{ companyId }, jobScope, ...(query.jobId ? [{ id: query.jobId }] : [])] };
    const [stages, rows, jobs] = await Promise.all([
      this.prisma.pipelineStage.findMany({ where: { pipeline: { companyId } }, select: { name: true, kind: true, slaDays: true } }),
      this.prisma.application.findMany({
        where: { companyId, createdAt: { gte: from, lte: to }, job: { is: jobWhere } },
        select: { id: true, jobId: true, createdAt: true, status: true, source: true, rejectionCode: true, stageMovedAt: true, stage: { select: { name: true } }, events: { select: { type: true, fromStage: true, toStage: true, userId: true, createdAt: true }, orderBy: { createdAt: 'asc' } } },
        take: 5000,
      }),
      this.prisma.job.findMany({ where: jobWhere, select: { id: true, title: true, createdAt: true, costAmount: true, recruiters: { select: { userId: true } }, sourceCosts: { select: { source: true, amount: true } } } }),
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

    const pcd = await this.pcdIndicator(companyId, jobWhere);

    // Custo (RS-R-10): vagas criadas no periodo ou com candidaturas nele; custo por contratacao = custo total / contratados.
    const active = new Set(rows.map((row) => row.jobId));
    const costJobs = jobs.filter((job) => (job.createdAt >= from && job.createdAt <= to) || active.has(job.id))
      .map((job) => ({ id: job.id, title: job.title, costAmount: num(job.costAmount), sourceCosts: job.sourceCosts.map((row) => ({ source: row.source, amount: num(row.amount) ?? 0 })) }));
    // Custo e dado financeiro: gestor e RH - R&S veem os relatorios de processo, nao os valores.
    const costs = computeCosts(opts.includeCosts === false ? [] : costJobs, rows.map((row) => ({ jobId: row.jobId, source: row.source, status: row.status })));
    const titleOf = new Map(jobs.map((job) => [job.id, job.title]));
    const stageSla = computeStageSla(stages.map((stage) => ({ name: stage.name, kind: stage.kind, slaDays: stage.slaDays ?? null })), rows.map((row) => ({ id: row.id, jobId: row.jobId, jobTitle: titleOf.get(row.jobId) ?? '', createdAt: row.createdAt, status: row.status, currentStage: row.stage?.name ?? null, stageMovedAt: row.stageMovedAt, events: row.events as never })), new Date());
    // No-show: depende do campo `noShow` do cadastro de entrevistas (pacote de entrevistas). Sem o campo a taxa fica indisponivel.
    const interviews = await this.prisma.applicationInterview.findMany({ where: { application: { is: { companyId, job: { is: jobWhere } } }, scheduledAt: { gte: from, lte: to } }, take: 5000 });
    const noShow = noShowRate(interviews as Array<{ noShow?: boolean | null }>);

    return { pcd, costs, stageSla, noShow, period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }, ...result, recruiters, jobs: jobs.map((job) => ({ id: job.id, title: job.title })) };
  }

  /** Indicador da cota PCD (Lei 8.213/91, art. 93): empregados ativos, contratados PCD declarados no processo seletivo e vagas PCD abertas. */
  private async pcdIndicator(companyId: string, jobWhere: Prisma.JobWhereInput) {
    const [employees, hired, openJobs] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, status: { in: ['ACTIVE', 'ONBOARDING'] } } }),
      this.prisma.application.findMany({ where: { companyId, status: 'HIRED' }, select: { id: true }, take: 5000 }),
      this.prisma.job.count({ where: { AND: [jobWhere, { pcd: true, status: 'OPEN' }] } }),
    ]);
    const filled = hired.length ? await this.prisma.candidateDiversity.count({ where: { companyId, pcd: true, applicationId: { in: hired.map((row) => row.id) } } }) : 0;
    return { quota: pcdQuota(employees, filled), openPcdJobs: openJobs };
  }

  /** Custos informados de uma vaga (fixo + por origem). */
  async costs(companyId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true, costAmount: true, sourceCosts: { select: { source: true, amount: true }, orderBy: { source: 'asc' } } } });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return { costAmount: num(job.costAmount), sources: job.sourceCosts.map((row) => ({ source: row.source, amount: num(row.amount) ?? 0 })) };
  }

  /** Substitui os custos por origem da vaga (valor 0 remove a linha) e, se informado, o custo fixo. */
  async saveCosts(companyId: string, jobId: string, input: { costAmount?: number | null; sources: Array<{ source: string; amount: number }> }) {
    const seen = new Set<string>();
    for (const row of input.sources) { if (seen.has(row.source)) throw new BadRequestException('Origem repetida nos custos.'); seen.add(row.source); }
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true } });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    const keep = input.sources.filter((row) => row.amount > 0);
    await this.prisma.$transaction([
      this.prisma.jobSourceCost.deleteMany({ where: { jobId, companyId } }),
      ...(keep.length ? [this.prisma.jobSourceCost.createMany({ data: keep.map((row) => ({ companyId, jobId, source: row.source, amount: row.amount })) })] : []),
      ...(input.costAmount !== undefined ? [this.prisma.job.updateMany({ where: { id: jobId, companyId }, data: { costAmount: input.costAmount } })] : []),
    ]);
    return this.costs(companyId, jobId);
  }

  /** Relatório em CSV (mesmos números da tela): indicadores, funil, custo, SLA por etapa e origem. */
  async exportCsv(companyId: string, jobScope: Prisma.JobWhereInput, query: { from?: string; to?: string; jobId?: string }, opts: { includeCosts?: boolean } = {}) {
    const m = await this.metrics(companyId, jobScope, query, opts);
    const blank: unknown[] = [];
    const rows: unknown[][] = [
      ['Período', `${m.period.from} a ${m.period.to}`, ''], ['Candidaturas', m.totals.applications, ''], ['Contratados', m.totals.hired, ''],
      ['Tempo médio para contratar (dias)', m.timeToHireDays.average ?? '', ''], ['Tempo médio para preencher (dias)', m.timeToFillDays.average ?? '', ''], ['Aceite de propostas (%)', m.offerAcceptanceRate ?? '', ''],
      ['Custo total (R$)', m.costs.total, ''], ['Custo por contratação (R$)', m.costs.costPerHire ?? '', ''], ['Taxa de no-show (%)', m.noShow.available ? m.noShow.rate ?? '' : 'indisponível', ''],
      blank, ['Etapa', 'Candidatos', 'Conversão (%)'], ...m.funnel.map((f) => [f.label, f.count, f.conversionFromPrevious ?? '']),
      blank, ['Origem', 'Candidaturas', 'Contratados'], ...m.bySource.map((s) => [s.source, s.applications, s.hires]),
      blank, ['Custo por origem', 'Custo (R$)', 'Custo por contratação (R$)'], ...m.costs.bySource.map((s) => [s.source, s.cost, s.costPerHire ?? '']),
      blank, ['Custo por vaga', 'Custo (R$)', 'Custo por contratação (R$)'], ...m.costs.byJob.map((j) => [j.title, j.cost, j.costPerHire ?? '']),
      blank, ['SLA por etapa', 'Prazo (dias)', 'Tempo médio (dias)', 'Parados agora', 'Acima do prazo'], ...m.stageSla.stages.map((s) => [s.name, s.slaDays ?? '', s.averageDays ?? '', s.stalled, s.overSla]),
      blank, ['Cota PCD', 'Exigida', 'Contratados PCD', 'Faltam'], ['', m.pcd.quota.required, m.pcd.quota.filled, m.pcd.quota.missing],
    ];
    return buildCsv(['Indicador', 'Valor', 'Detalhe 1', 'Detalhe 2', 'Detalhe 3'], rows.map((row) => [...row, ...Array(Math.max(0, 5 - row.length)).fill('')]).map((row) => row.slice(0, 5)));
  }
}
