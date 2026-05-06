export type FinanceStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'unauthenticated' | 'validation';

export type PaymentProvider = 'stripe' | 'asaas' | 'mercadopago' | 'internal';

export type SubscriptionState = 'trial' | 'active' | 'past_due' | 'canceled' | 'blocked' | 'pending';

export type PaymentState = 'pending' | 'paid' | 'failed' | 'refunded' | 'chargeback' | 'canceled';

export type DunningState = 'none' | 'notice_sent' | 'retry_scheduled' | 'suspended';

export type LoadingState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'empty'; data: T | null; error: null }
  | { status: 'error'; data: T | null; error: string }
  | { status: 'unauthenticated'; data: null; error: string }
  | { status: 'validation'; data: null; error: string };

export interface SafeMoney {
  amount: number;
  currency: 'BRL';
  formatted: string;
}
