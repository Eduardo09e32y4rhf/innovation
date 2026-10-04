/** Valor em R$ tolerante: aceita número, texto ("20.00") e vazio sem nunca mostrar NaN. */
export function money(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function shortDate(value?: string | null): string {
  return value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';
}

const BILLING_STATUS: Record<string, string> = {
  TRIAL: 'Em teste', PENDING_PAYMENT: 'Aguardando pagamento', ACTIVE: 'Em dia', PAST_DUE: 'Inadimplente', CANCELED: 'Cancelado',
};

/** "Em teste" só aparece com teste de verdade (data de fim); empresa sem assinatura e sem teste é dita como tal. */
export function billingLabel(company: { billingStatus: string; trialEndsAt?: string | null; subscription?: unknown }): string {
  if (company.billingStatus === 'TRIAL') {
    if (company.trialEndsAt) return `Em teste até ${shortDate(company.trialEndsAt)}`;
    return company.subscription ? 'Em teste' : 'Sem assinatura';
  }
  return BILLING_STATUS[company.billingStatus] ?? company.billingStatus;
}