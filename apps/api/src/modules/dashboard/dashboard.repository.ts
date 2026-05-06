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
      revenuePaid,
      expensesPaid,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.message.count({ where: { companyId } }),
      this.prisma.job.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.candidate.count({ where: { companyId } }),
      this.prisma.application.count({ where: { companyId } }),
      this.prisma.financialTransaction.aggregate({
        where: { companyId, type: 'REVENUE', status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { companyId, type: 'EXPENSE', status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const revenue = Number(revenuePaid._sum.amount ?? 0);
    const expenses = Number(expensesPaid._sum.amount ?? 0);
    return {
      communication: { conversationsOpen, messagesTotal },
      recruitment: { jobsOpen, candidatesTotal, applicationsTotal },
      finance: { revenue, expenses, balance: revenue - expenses },
    };
  }
}
