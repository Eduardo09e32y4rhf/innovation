import type { PlatformCompany, PublicPlatformPlan } from '@/app/lib/api';

export type SubscriptionCompany = PlatformCompany & {
  subscription?: {
    status?: string | null;
    seatQuantity?: number | null;
    pendingSeatQuantity?: number | null;
    nextDueDate?: string | null;
    currentPeriodEnd?: string | null;
  } | null;
  trialEndsAt?: string | null;
};

export const STATUS_FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'PENDING_PAYMENT', label: 'Aguardando pagamento' },
  { value: 'PAST_DUE', label: 'Em atraso' },
  { value: 'CANCELED', label: 'Canceladas' },
] as const;

export function money(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dateLabel(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

export function plainDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

export function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function formatAction(action: string) {
  const labels: Record<string, string> = {
    COMPANY_CREATED: 'Conta criada',
    BILLING_ONBOARDING_PAYMENT_CREATED: 'Primeira cobrança gerada',
    BILLING_ONBOARDING_PENDING: 'Cobrança pendente',
    BILLING_ONBOARDING_READY: 'Onboarding pronto',
    ONBOARDING_FREE_ACTIVATED: 'Plano free ativado',
    ONBOARDING_TRIAL_READY: 'Trial liberado',
    ONBOARDING_TRIAL_SUBSCRIPTION_SCHEDULED: 'Assinatura agendada',
    ONBOARDING_PAYMENT_READY: 'Pagamento preparado',
    SEATS_QUANTITY_CHANGED: 'Assentos aumentados',
    SEATS_REDUCTION_SCHEDULED: 'Redução agendada',
    PLAN_CHANGED: 'Plano alterado',
    INVOICE_SYNCED: 'Fatura sincronizada',
    INVOICE_CANCELED: 'Fatura cancelada',
    INVOICE_REFUND_REQUESTED: 'Estorno solicitado',
    INITIAL_CHARGE_CREATED: 'Cobrança inicial criada',
    RECURRING_SUBSCRIPTION_CREATED: 'Assinatura recorrente criada',
    MANUAL_CONTRACT_BILLING_SYNCED: 'Contrato manual integrado',
  };
  return labels[action] || action.replace(/_/g, ' ').toLowerCase();
}

export function auditTone(action: string) {
  if (action.includes('CANCELED') || action.includes('PENDING') || action.includes('REFUND')) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (action.includes('SCHEDULED') || action.includes('READY') || action.includes('TRIAL')) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

export function statusTone(status?: string | null) {
  if (status === 'ACTIVE') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'TRIAL' || status === 'PENDING_PAYMENT') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'PAST_DUE') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'CANCELED') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

export function lifecycleLabel(company: SubscriptionCompany) {
  const billingStatus = company.billingStatus || company.subscription?.status || 'TRIAL';
  if (billingStatus === 'ACTIVE') return 'Ativa e faturando';
  if (billingStatus === 'TRIAL') return 'Conta criada, trial ativo';
  if (billingStatus === 'PENDING_PAYMENT') return 'Aguardando primeiro pagamento';
  if (billingStatus === 'PAST_DUE') return 'Cobrança vencida';
  if (billingStatus === 'CANCELED') return 'Cancelamento em ciclo final';
  return 'Sem status definido';
}

export function planPricing(plan?: PublicPlatformPlan | null, seats = 0) {
  if (!plan) return null;
  const base = Number(plan.baseMonthlyPrice ?? plan.price ?? 0);
  const user = Number(plan.userMonthlyPrice ?? 0);
  const currentSeats = Math.max(0, Number(seats) || 0);
  const total = plan.isFree ? 0 : base + (user * Math.max(0, currentSeats - Number(plan.includedUnits ?? 0)));
  return { base, user, total, currentSeats };
}

