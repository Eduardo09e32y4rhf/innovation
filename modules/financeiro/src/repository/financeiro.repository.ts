import type { FinanceHistoryEntryDTO, FinanceInvoiceDTO, FinancePaymentStatusDTO, FinancePlanDTO, FinanceSubscriptionDTO } from '../types/financeiro.dto';

export interface FinanceiroRepository {
  listPlans(): Promise<FinancePlanDTO[]>;
  getSubscription(companyId: string): Promise<FinanceSubscriptionDTO | null>;
  listInvoices(companyId: string): Promise<FinanceInvoiceDTO[]>;
  listHistory(companyId: string): Promise<FinanceHistoryEntryDTO[]>;
  getPaymentStatus(paymentId: string): Promise<FinancePaymentStatusDTO | null>;
}

export class InMemoryFinanceiroRepository implements FinanceiroRepository {
  constructor(private readonly deps: {
    plans: FinancePlanDTO[];
    subscriptions: FinanceSubscriptionDTO[];
    invoices: FinanceInvoiceDTO[];
    history: FinanceHistoryEntryDTO[];
    payments: FinancePaymentStatusDTO[];
  }) {}

  async listPlans() { return this.deps.plans; }
  async getSubscription(companyId: string) { return this.deps.subscriptions.find((item) => item.companyId === companyId) ?? null; }
  async listInvoices(companyId: string) { return this.deps.invoices.filter((item) => item.id.startsWith(companyId) || companyId.length > 0); }
  async listHistory(companyId: string) { return this.deps.history.filter((item) => item.id.startsWith(companyId) || companyId.length > 0); }
  async getPaymentStatus(paymentId: string) { return this.deps.payments.find((item) => item.paymentId === paymentId) ?? null; }
}
