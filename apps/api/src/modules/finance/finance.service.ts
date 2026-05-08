import { Injectable } from '@nestjs/common';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { FinanceRepository } from './finance.repository';

type MonthlySummaryRow = {
  type: string;
  status: string;
  _sum: {
    amount: unknown;
  };
};

@Injectable()
export class FinanceService {
  constructor(private readonly repository: FinanceRepository) {}

  list(companyId: string) { return this.repository.list(companyId); }
  get(companyId: string, id: string) { return this.repository.get(companyId, id); }

  create(companyId: string, dto: CreateTransactionDto) {
    return this.repository.create(companyId, {
      description: dto.description,
      amount: dto.amount.toFixed(2),
      type: dto.type,
      status: dto.status ?? 'PENDING',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  update(companyId: string, id: string, dto: UpdateTransactionDto) {
    return this.repository.update(companyId, id, {
      description: dto.description,
      amount: dto.amount === undefined ? undefined : dto.amount.toFixed(2),
      type: dto.type,
      status: dto.status,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      paidAt: dto.status === 'PAID' ? new Date() : undefined,
    });
  }

  delete(companyId: string, id: string) { return this.repository.delete(companyId, id); }

  async summary(companyId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const rows = await this.repository.monthlySummary(companyId, start, end) as MonthlySummaryRow[];
    const sum = (type: string, status?: string) =>
      rows
        .filter((row: MonthlySummaryRow) => row.type === type && (!status || row.status === status))
        .reduce((total: number, row: MonthlySummaryRow) => total + Number(row._sum.amount ?? 0), 0);
    const revenueMonth = sum('REVENUE', 'PAID');
    const expenseMonth = sum('EXPENSE', 'PAID');
    return {
      revenueMonth,
      expenseMonth,
      balanceMonth: revenueMonth - expenseMonth,
      pendingRevenue: sum('REVENUE', 'PENDING'),
      pendingExpense: sum('EXPENSE', 'PENDING'),
    };
  }
}
