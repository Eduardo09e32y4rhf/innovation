/** Funções puras do reembolso e da avaliação no suporte (sem React). */
import type { StatusTone, SupportTicket } from './support-model';

export const FULL_REFUND_WINDOW_DAYS = 7;
export const REOPEN_WINDOW_DAYS = 7;
const DAY = 86_400_000;

const REFUND_LABEL: Record<string, string> = {
  REQUESTED: 'Solicitado', AWAITING_SECOND_APPROVAL: 'Aguardando 2ª aprovação', APPROVED: 'Aprovado',
  PROCESSING: 'Em processamento', CONFIRMED: 'Confirmado', REJECTED: 'Recusado', FAILED: 'Falhou',
};
const REFUND_TONE: Record<string, StatusTone> = {
  REQUESTED: 'info', AWAITING_SECOND_APPROVAL: 'warning', APPROVED: 'brand', PROCESSING: 'violet',
  CONFIRMED: 'success', REJECTED: 'danger', FAILED: 'danger',
};
export const getRefundStatusLabel = (status?: string | null): string => (status ? REFUND_LABEL[status] ?? status : '');
export const getRefundStatusTone = (status?: string | null): StatusTone => (status ? REFUND_TONE[status] ?? 'neutral' : 'neutral');
export const refundKindLabel = (kind?: string | null): string => (kind === 'TOTAL' ? 'Total' : kind === 'PARTIAL' ? 'Parcial' : '—');

export const formatBRL = (value: unknown): string =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Lê "1.234,56", "12,5" ou "12.5" como número; NaN quando inválido. */
export function parseAmount(text: string): number {
  const t = text.trim().replace(/[^\d.,]/g, '');
  if (!t) return NaN;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return Number(normalized);
}

export interface RefundableInvoice { id: string; status: string; amount: number | string; refundedAmount?: number | string; paidAt?: string | null; dueDate?: string; description?: string | null }

export const refundableBalance = (inv: Pick<RefundableInvoice, 'amount' | 'refundedAmount'>): number =>
  Math.max(0, Math.round((Number(inv.amount) - Number(inv.refundedAmount ?? 0)) * 100) / 100);

/** Só faturas pagas e com saldo a devolver, as mais recentes primeiro. */
export function listRefundableInvoices<T extends RefundableInvoice>(invoices: T[]): T[] {
  const when = (i: T) => new Date(i.paidAt || i.dueDate || 0).getTime();
  return invoices.filter((i) => i.status === 'PAID' && refundableBalance(i) > 0).sort((a, b) => when(b) - when(a));
}

export function isWithinFullWindow(paidAt: string | null | undefined, now = Date.now()): boolean {
  if (!paidAt) return false;
  return now - new Date(paidAt).getTime() <= FULL_REFUND_WINDOW_DAYS * DAY;
}

export const REFUND_RULE_TEXT = `Reembolso integral até ${FULL_REFUND_WINDOW_DAYS} dias após o pagamento. Depois desse prazo, só é possível devolver o valor proporcional ao período não usado, e apenas em plano anual.`;

export function refundRuleHint(paidAt: string | null | undefined, now = Date.now()): string {
  return isWithinFullWindow(paidAt, now)
    ? 'Esta fatura está dentro do prazo de 7 dias: o reembolso integral é permitido.'
    : 'Esta fatura passou de 7 dias: só será aceito o valor proporcional ao período não usado, e apenas em plano anual.';
}

/** Mensagem de erro do formulário de reembolso, ou null quando está tudo certo. */
export function validateRefundForm(input: { invoiceId: string; kind: 'TOTAL' | 'PARTIAL'; amountText: string; reason: string; available: number }): string | null {
  if (!input.invoiceId) return 'Escolha a fatura.';
  if (input.kind === 'PARTIAL') {
    const amount = parseAmount(input.amountText);
    if (!Number.isFinite(amount) || amount <= 0) return 'Informe o valor a devolver.';
    if (amount > input.available + 0.001) return `O valor passa do saldo reembolsável (${formatBRL(input.available)}).`;
  }
  const reason = input.reason.trim();
  if (reason.length < 5) return 'Conte o motivo do reembolso (mínimo de 5 caracteres).';
  if (reason.length > 2000) return 'O motivo pode ter até 2.000 caracteres.';
  return null;
}

export interface RefundActions { canApprove: boolean; canReject: boolean; hint?: string }

/** Quais botões a plataforma vê: nunca para quem pediu, e a 2ª aprovação precisa ser de outra pessoa. */
export function refundDecisionActions(ticket: Pick<SupportTicket, 'refundStatus' | 'createdByUserId' | 'refundDecisionById'>, userId?: string | null, isPlatform = false): RefundActions {
  const none = { canApprove: false, canReject: false };
  if (!isPlatform || !userId) return none;
  const status = ticket.refundStatus;
  if (status !== 'REQUESTED' && status !== 'AWAITING_SECOND_APPROVAL') return none;
  if (ticket.createdByUserId === userId) return { ...none, hint: 'Quem pediu o reembolso não pode decidi-lo.' };
  if (status === 'AWAITING_SECOND_APPROVAL' && ticket.refundDecisionById === userId) {
    return { canApprove: false, canReject: true, hint: 'Você deu a primeira aprovação. A segunda precisa ser de outra pessoa.' };
  }
  return { canApprove: true, canReject: true };
}

/** Texto de erro ao aprovar/recusar; trata o 409 de quem já aprovou. */
export function refundDecisionError(err: unknown): string {
  const e = err as { status?: number; message?: string };
  if (e?.status === 409 && /segunda aprova|outro usu/i.test(e.message ?? '')) return 'A segunda aprovação precisa ser de outra pessoa.';
  if (e?.status === 409) return e.message || 'O pedido foi alterado por outra pessoa. Atualize a página.';
  return e?.message || 'Não foi possível registrar a decisão.';
}

export const hasRefund = (t: Pick<SupportTicket, 'refundStatus'>): boolean => Boolean(t.refundStatus);

const isResolvedOrClosed = (status: string) => status === 'RESOLVED' || status === 'CLOSED';

/** Quem abriu pode avaliar quando Resolvido/Encerrado e ainda sem nota. */
export function canRateTicket(t: Pick<SupportTicket, 'status' | 'createdByUserId' | 'satisfactionScore'>, userId?: string | null): boolean {
  return Boolean(userId) && t.createdByUserId === userId && isResolvedOrClosed(t.status) && (t.satisfactionScore ?? null) === null;
}
/** Mostra o bloco de avaliação: para quem abriu, quando finalizado ou já avaliado. */
export function showRatingBlock(t: Pick<SupportTicket, 'status' | 'createdByUserId' | 'satisfactionScore'>, userId?: string | null): boolean {
  if (!userId || t.createdByUserId !== userId) return false;
  return (t.satisfactionScore ?? null) !== null || isResolvedOrClosed(t.status);
}

/** Reabrir: resolvido/encerrado há no máximo 7 dias. */
export function canReopenResolved(t: Pick<SupportTicket, 'status' | 'resolvedAt' | 'closedAt'>, now = Date.now()): boolean {
  if (!isResolvedOrClosed(t.status)) return false;
  const since = t.resolvedAt || t.closedAt;
  return Boolean(since) && now - new Date(since as string).getTime() <= REOPEN_WINDOW_DAYS * DAY;
}

/** Navegação por teclado nas estrelas: setas, Home e End. */
export function nextStarScore(current: number, key: string): number | null {
  const c = current || 0;
  if (key === 'ArrowRight' || key === 'ArrowUp') return Math.min(5, c + 1);
  if (key === 'ArrowLeft' || key === 'ArrowDown') return Math.max(1, c - 1);
  if (key === 'Home') return 1;
  if (key === 'End') return 5;
  return null;
}
export const STAR_LABELS = ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];
