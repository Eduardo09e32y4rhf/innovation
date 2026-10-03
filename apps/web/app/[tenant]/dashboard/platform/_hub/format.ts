export const money = (value: number | string | null | undefined) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const date = (value?: string | null) => {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
};

export const dateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)) : '—';

export const monthKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);

export function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00Z`));

export const COMPANY_STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: 'Ativa', tone: 'bg-emerald-50 text-emerald-700' },
  SUSPENDED: { label: 'Suspensa', tone: 'bg-amber-50 text-amber-700' },
  CANCELLED: { label: 'Cancelada', tone: 'bg-rose-50 text-rose-700' },
};

export const BILLING_STATUS: Record<string, { label: string; tone: string }> = {
  TRIAL: { label: 'Teste', tone: 'bg-sky-50 text-sky-700' },
  ACTIVE: { label: 'Em dia', tone: 'bg-emerald-50 text-emerald-700' },
  PENDING_PAYMENT: { label: 'Aguardando pagamento', tone: 'bg-amber-50 text-amber-700' },
  PAST_DUE: { label: 'Inadimplente', tone: 'bg-rose-50 text-rose-700' },
  CANCELED: { label: 'Cancelada', tone: 'bg-zinc-100 text-zinc-600' },
};

export const INVOICE_STATUS: Record<string, { label: string; tone: string }> = {
  OPEN: { label: 'Em aberto', tone: 'bg-amber-50 text-amber-700' },
  PAID: { label: 'Paga', tone: 'bg-emerald-50 text-emerald-700' },
  OVERDUE: { label: 'Vencida', tone: 'bg-rose-50 text-rose-700' },
  CANCELED: { label: 'Cancelada', tone: 'bg-zinc-100 text-zinc-600' },
};

export const WORKFLOW_STATUS: Record<string, string> = {
  DRAFT: 'Rascunho', IN_REVIEW: 'Em revisão', APPROVED: 'Aprovado', CLOSED: 'Fechado', PROCESSING: 'Processando', PAID: 'Pago', CANCELLED: 'Cancelado',
};

export const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);
