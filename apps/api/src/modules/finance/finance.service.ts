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

  list(companyId: string) {
    return this.repository.list(companyId);
  }

  get(companyId: string, id: string) {
    return this.repository.get(companyId, id);
  }

  due(companyId: string, days = 7) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    return this.repository.listDue(companyId, start, end);
  }

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

  delete(companyId: string, id: string) {
    return this.repository.delete(companyId, id);
  }

  async summary(companyId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const [rows, chartTransactions, recent, dueSoon] = await Promise.all([
      this.repository.monthlySummary(companyId, start, end) as Promise<MonthlySummaryRow[]>,
      this.repository.monthlyTransactions(companyId, chartStart, end),
      this.repository.recent(companyId, 5),
      this.due(companyId, 7),
    ]);

    const sum = (type: string, status?: string) =>
      rows
        .filter((row) => row.type === type && (!status || row.status === status))
        .reduce((total, row) => total + Number(row._sum.amount ?? 0), 0);
    const revenueMonth = sum('REVENUE', 'PAID');
    const expenseMonth = sum('EXPENSE', 'PAID');

    return {
      revenueMonth,
      expenseMonth,
      balanceMonth: revenueMonth - expenseMonth,
      pendingRevenue: sum('REVENUE', 'PENDING'),
      pendingExpense: sum('EXPENSE', 'PENDING'),
      pendingCount: dueSoon.length,
      dueSoonTotal: dueSoon.reduce((total, item: any) => total + Number(item.amount), 0),
      cashFlow: this.buildCashFlow(chartTransactions, chartStart, now),
      categories: this.buildCategories(chartTransactions),
      recent,
    };
  }

  private buildCashFlow(transactions: Array<{ amount: unknown; type: string; createdAt: Date }>, start: Date, now: Date) {
    const months = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        mes: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', ''),
        entrada: 0,
        saida: 0,
      };
    });

    transactions.forEach((transaction) => {
      const key = `${transaction.createdAt.getFullYear()}-${String(transaction.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const month = months.find((item) => item.key === key);
      if (!month) return;
      const value = Number(transaction.amount);
      if (transaction.type === 'REVENUE') month.entrada += value;
      if (transaction.type === 'EXPENSE') month.saida += value;
    });

    if (!transactions.length) {
      months[months.length - 1].mes = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(now).replace('.', '');
    }

    return months.map(({ key: _key, ...month }) => month);
  }

  private buildCategories(transactions: Array<{ amount: unknown; type: string; description: string }>) {
    const totals = transactions
      .filter((transaction) => transaction.type === 'REVENUE')
      .reduce<Record<string, number>>((acc, transaction) => {
        const category = this.inferCategory(transaction.description);
        acc[category] = (acc[category] ?? 0) + Number(transaction.amount);
        return acc;
      }, {});

    return Object.entries(totals)
      .map(([cat, val]) => ({ cat, val }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 6);
  }

  private inferCategory(description: string) {
    const text = description.toLowerCase();
    if (text.includes('mensalidade') || text.includes('plano') || text.includes('licenca')) return 'SaaS';
    if (text.includes('setup') || text.includes('implant')) return 'Servicos';
    if (text.includes('consult')) return 'Consultoria';
    if (text.includes('campanha') || text.includes('marketing')) return 'Marketing';
    if (text.includes('cloud') || text.includes('aws') || text.includes('software')) return 'Tecnologia';
    return 'Outros';
  }
}
