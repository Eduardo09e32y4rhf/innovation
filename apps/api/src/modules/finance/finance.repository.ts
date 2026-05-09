import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FinanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.financialTransaction.findMany({ where: { companyId }, orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }] });
  }

  recent(companyId: string, take = 5) {
    return this.prisma.financialTransaction.findMany({
      where: { companyId },
      orderBy: [{ createdAt: 'desc' }],
      take,
    });
  }

  listDue(companyId: string, start: Date, end: Date) {
    return this.prisma.financialTransaction.findMany({
      where: {
        companyId,
        status: { in: ['PENDING'] },
        dueDate: { gte: start, lte: end },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(companyId: string, data: any) {
    return this.prisma.financialTransaction.create({ data: { ...data, companyId } });
  }

  async get(companyId: string, id: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({ where: { companyId, id } });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async update(companyId: string, id: string, data: any) {
    const result = await this.prisma.financialTransaction.updateMany({ where: { companyId, id }, data });
    if (!result.count) throw new NotFoundException('Transaction not found');
    return this.get(companyId, id);
  }

  async delete(companyId: string, id: string) {
    const result = await this.prisma.financialTransaction.deleteMany({ where: { companyId, id } });
    if (!result.count) throw new NotFoundException('Transaction not found');
    return { deleted: true };
  }

  monthlySummary(companyId: string, start: Date, end: Date) {
    return this.prisma.financialTransaction.groupBy({
      by: ['type', 'status'],
      where: { companyId, createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });
  }

  monthlyTransactions(companyId: string, start: Date, end: Date) {
    return this.prisma.financialTransaction.findMany({
      where: {
        companyId,
        createdAt: { gte: start, lt: end },
        status: { not: 'CANCELED' },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  countBy(companyId: string, type: string, status: string) {
    return this.prisma.financialTransaction.count({ where: { companyId, type, status } as any });
  }
}
