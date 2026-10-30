import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JOB_AUDIT_LABEL } from './job-audit';
import { JobsRepository } from './jobs.repository';

/** Registra (via repository.audit) e lista o histórico de ações da vaga. Falha de auditoria nunca derruba a ação principal. */
@Injectable()
export class JobAuditService {
  private readonly logger = new Logger(JobAuditService.name);
  constructor(private readonly repository: JobsRepository, private readonly prisma: PrismaService) {}

  async record(companyId: string, userId: string | null | undefined, action: string, jobId: string, metadata: Record<string, unknown> = {}) {
    if (!userId) return;
    try {
      await this.repository.audit(companyId, userId, action, jobId, metadata);
    } catch (error) {
      this.logger.warn(`Auditoria ${action} não gravada: ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Movimentação em lote: uma linha por vaga afetada, com a quantidade de candidatos. */
  async recordBulkMove(companyId: string, userId: string, applicationIds: string[], stageId: string | undefined, moved: number) {
    if (!moved || !stageId) return;
    const apps = await this.prisma.application.findMany({ where: { companyId, id: { in: applicationIds } }, select: { jobId: true } });
    const perJob = new Map<string, number>();
    for (const app of apps) perJob.set(app.jobId, (perJob.get(app.jobId) ?? 0) + 1);
    for (const [jobId, count] of perJob) await this.record(companyId, userId, 'JOB_STAGE_CHANGED', jobId, { bulk: true, stageId, candidates: count });
  }

  async history(companyId: string, jobId: string, take = 100) {
    const rows = await this.prisma.auditLog.findMany({ where: { companyId, entity: 'Job', entityId: jobId }, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(take, 1), 300), select: { id: true, action: true, createdAt: true, metadata: true, userId: true } });
    const ids = [...new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id)))];
    const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    return rows.map((row) => ({ id: row.id, action: row.action, label: JOB_AUDIT_LABEL[row.action] ?? row.action, createdAt: row.createdAt, userName: users.find((user) => user.id === row.userId)?.name ?? null, metadata: row.metadata ?? {} }));
  }
}
