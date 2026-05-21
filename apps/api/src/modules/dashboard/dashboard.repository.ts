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
      financials,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.message.count({ where: { companyId } }),
      this.prisma.job.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.candidate.count({ where: { companyId } }),
      this.prisma.application.count({ where: { companyId } }),
      // Optimize: Single database roundtrip for aggregating financial records instead of two separate aggregates. Expected impact: Reduces database latency and queries by 50% for financial data in the dashboard summary endpoint.
      this.prisma.financialTransaction.groupBy({
        by: ['type'],
        where: { companyId, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    // Optimize: Single database roundtrip for aggregating financial records instead of two separate aggregates
    const revenue = Number(financials.find((f: { type: string, _sum: { amount: any } }) => f.type === 'REVENUE')?._sum.amount ?? 0);
    const expenses = Number(financials.find((f: { type: string, _sum: { amount: any } }) => f.type === 'EXPENSE')?._sum.amount ?? 0);
    return {
      communication: { conversationsOpen, messagesTotal },
      recruitment: { jobsOpen, candidatesTotal, applicationsTotal },
      finance: { revenue, expenses, balance: revenue - expenses },
    };
  }
}
