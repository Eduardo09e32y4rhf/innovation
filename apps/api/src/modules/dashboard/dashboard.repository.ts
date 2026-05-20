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
      financialsPaid,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.message.count({ where: { companyId } }),
      this.prisma.job.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.candidate.count({ where: { companyId } }),
      this.prisma.application.count({ where: { companyId } }),
      this.prisma.financialTransaction.groupBy({
        by: ['type'],
        where: { companyId, status: 'PAID', type: { in: ['REVENUE', 'EXPENSE'] } },
        _sum: { amount: true },
      }),
    ]);

    // ⚡ Bolt: Replaced two aggregate queries with a single groupBy query for better performance.
    const revenueData = financialsPaid.find((item) => item.type === 'REVENUE');
    const expenseData = financialsPaid.find((item) => item.type === 'EXPENSE');
    const revenue = Number(revenueData?._sum.amount ?? 0);
    const expenses = Number(expenseData?._sum.amount ?? 0);
    return {
      communication: { conversationsOpen, messagesTotal },
      recruitment: { jobsOpen, candidatesTotal, applicationsTotal },
      finance: { revenue, expenses, balance: revenue - expenses },
    };
  }
}
