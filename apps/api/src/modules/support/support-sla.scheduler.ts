import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SupportSlaScheduler {
  private readonly logger = new Logger(SupportSlaScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSla() {
    this.logger.log('Iniciando verificação de SLA dos chamados de suporte...');
    const now = new Date();

    const result = await this.prisma.supportTicket.updateMany({
      where: {
        status: { in: ['NEW', 'TRIAGE', 'IN_PROGRESS'] },
        slaBreached: false,
        resolutionDueAt: { lt: now }
      },
      data: {
        slaBreached: true
      }
    });

    if (result.count > 0) {
      this.logger.warn(`SLA violado para ${result.count} chamados.`);
    }

    // First response SLA check
    const firstResponseResult = await this.prisma.supportTicket.updateMany({
      where: {
        firstRespondedAt: null,
        status: 'NEW',
        slaBreached: false,
        firstResponseDueAt: { lt: now }
      },
      data: {
        slaBreached: true
      }
    });

    if (firstResponseResult.count > 0) {
      this.logger.warn(`SLA de primeira resposta violado para ${firstResponseResult.count} chamados.`);
    }
  }
}