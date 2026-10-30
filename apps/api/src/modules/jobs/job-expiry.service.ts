import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RecruiterNotifierService } from './recruiter-notifier.service';

/** RS-R-05: vagas OPEN com prazo vencido passam a CLOSED (o portal público já as esconde; aqui o status acompanha). */
@Injectable()
export class JobExpiryService {
  private readonly logger = new Logger(JobExpiryService.name);

  constructor(private readonly prisma: PrismaService, private readonly notifier: RecruiterNotifierService) {}

  async closeExpired(now = new Date()) {
    const jobs = await this.prisma.job.findMany({
      where: { status: 'OPEN', deadline: { lt: now } },
      select: { id: true, companyId: true, title: true, deadline: true, recruiters: { select: { userId: true } } },
      take: 500,
    });
    let closed = 0;
    for (const job of jobs) {
      // updateMany condicional: se outra instância já fechou, não repete aviso nem auditoria.
      const { count } = await this.prisma.job.updateMany({ where: { id: job.id, status: 'OPEN' }, data: { status: 'CLOSED', closedAt: now } });
      if (!count) continue;
      closed += 1;
      await this.prisma.auditLog.create({ data: { companyId: job.companyId, userId: null, action: 'JOB_EXPIRED', entity: 'Job', entityId: job.id, metadata: { title: job.title, deadline: job.deadline } as any } }).catch((error) => this.logger.warn(`Auditoria JOB_EXPIRED falhou: ${error?.message}`));
      await this.notifier.notify({
        companyId: job.companyId, jobId: job.id, userIds: job.recruiters.map((row) => row.userId), roles: ['RH'] as any,
        title: `Vaga encerrada pelo prazo: ${job.title}`, lines: [`O prazo da vaga "${job.title}" venceu e ela foi encerrada automaticamente. Para voltar a receber candidatos, edite o prazo e publique de novo.`],
        kind: 'JOB_EXPIRED', cta: 'Abrir vaga',
      }).catch((error) => this.logger.warn(`Aviso JOB_EXPIRED falhou: ${error?.message}`));
    }
    return { closed };
  }
}
