import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string) {
    const [
      conversationsOpen,
      messagesTotal,
      jobsOpen,
      candidatesTotal,
      applicationsTotal,
      financialTotals,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.message.count({ where: { companyId } }),
      this.prisma.job.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.candidate.count({ where: { companyId } }),
      this.prisma.application.count({ where: { companyId } }),
      // ⚡ Bolt: Consolidated multiple .aggregate() calls into a single .groupBy() query to reduce database roundtrips
      this.prisma.financialTransaction.groupBy({
        by: ['type'],
        where: { companyId, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const revenue = Number(financialTotals.find((r: any) => r.type === 'REVENUE')?._sum?.amount ?? 0);
    const expenses = Number(financialTotals.find((r: any) => r.type === 'EXPENSE')?._sum?.amount ?? 0);
    return {
      communication: { conversationsOpen, messagesTotal },
      recruitment: { jobsOpen, candidatesTotal, applicationsTotal },
      finance: { revenue, expenses, balance: revenue - expenses },
    };
  }
}
