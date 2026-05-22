import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string) {
    // ⚡ Bolt: Consolidated financial aggregates using groupBy
    // Impact: Reduces separate database queries for revenue and expenses into one grouped query.
    // Why: Improves dashboard loading speed by removing unnecessary queries.
    const [
      conversationsOpen,
      messagesTotal,
      jobsOpen,
      candidatesTotal,
      applicationsTotal,
      financeTotals,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.message.count({ where: { companyId } }),
      this.prisma.job.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.candidate.count({ where: { companyId } }),
      this.prisma.application.count({ where: { companyId } }),
      this.prisma.financialTransaction.groupBy({
        by: ['type'],
        where: { companyId, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const revenue = Number(financeTotals.find((t: any) => t.type === 'REVENUE')?._sum.amount ?? 0);
    const expenses = Number(financeTotals.find((t: any) => t.type === 'EXPENSE')?._sum.amount ?? 0);
    return {
      communication: { conversationsOpen, messagesTotal },
      recruitment: { jobsOpen, candidatesTotal, applicationsTotal },
      finance: { revenue, expenses, balance: revenue - expenses },
    };
  }
}
