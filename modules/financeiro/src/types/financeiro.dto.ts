import type { DunningState, PaymentProvider, PaymentState, SafeMoney, SubscriptionState } from './financeiro.types';

export interface FinancePlanDTO {
  id: string;
  code: string;
  name: string;
  price: SafeMoney;
  features: string[];
  active: boolean;
}

export interface FinanceSubscriptionDTO {
  id: string;
  companyId: string;
  planId: string;
  planName: string;
  provider: PaymentProvider | null;
  state: SubscriptionState;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  nextAction: string | null;
  dunning: DunningState;
}

export interface FinanceInvoiceDTO {
  id: string;
  paymentId: string;
  description: string;
  amount: SafeMoney;
  status: PaymentState;
  dueAt: string | null;
  paidAt: string | null;
  downloadUrl: string | null;
}

export interface FinancePaymentStatusDTO {
  paymentId: string;
  provider: PaymentProvider | null;
  status: PaymentState;
  publicReference: string | null;
  updatedAt: string;
}

export interface FinanceHistoryEntryDTO {
  id: string;
  label: string;
  amount: SafeMoney;
  status: PaymentState;
  occurredAt: string;
}

export interface FinanceCheckoutDTO {
  planId: string;
  planName: string;
  checkoutUrl: string | null;
  requiresLogin: boolean;
}
