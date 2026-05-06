import type { FinanceCheckoutDTO, FinanceHistoryEntryDTO, FinanceInvoiceDTO, FinancePaymentStatusDTO, FinancePlanDTO, FinanceSubscriptionDTO } from '../types/financeiro.dto';
import type { FinanceiroRepository } from '../repository/financeiro.repository';
import { validateCheckoutRequest } from '../validation/financeiro.validation';

export class FinanceiroService {
  constructor(private readonly repository: FinanceiroRepository) {}

  listPlans() { return this.repository.listPlans(); }
  getSubscription(companyId: string) { return this.repository.getSubscription(companyId); }
  listInvoices(companyId: string) { return this.repository.listInvoices(companyId); }
  listHistory(companyId: string) { return this.repository.listHistory(companyId); }
  getPaymentStatus(paymentId: string) { return this.repository.getPaymentStatus(paymentId); }

  buildCheckout(input: FinanceCheckoutDTO) {
    const validation = validateCheckoutRequest(input);
    if (!validation.ok || !validation.data) {
      return validation;
    }
    return { ok: true, data: validation.data, error: null };
  }
}
