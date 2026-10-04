import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { CronLock } from '../../../common/redis/cron-lock.decorator';
import { RedisService } from '../../../common/redis/redis.service';
import { AsoService } from '../aso.service';

@Injectable()
export class SstCron {
  private readonly logger = new Logger(SstCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aso: AsoService,
    private readonly redis: RedisService,
  ) {}

  /** Todo dia às 06:00 gera o ASO periódico pendente de quem venceu (antes isso rodava a cada GET da lista). */
  @Cron('0 6 * * *')
  @CronLock('sst.periodic-aso', 3600)
  async generatePeriodicAsos() {
    const companies = await this.prisma.employeeAsoRecord.findMany({
      where: { status: 'COMPLETED', dueDate: { lte: new Date() } },
      distinct: ['companyId'],
      select: { companyId: true },
    });
    for (const { companyId } of companies) await this.aso.triggerPeriodicAso(companyId);
    this.logger.log(`ASO periódico verificado em ${companies.length} empresa(s).`);
  }
}
