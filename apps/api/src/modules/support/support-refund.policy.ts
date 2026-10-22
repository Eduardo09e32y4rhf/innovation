import { BadRequestException } from '@nestjs/common';

export const DEFAULT_REFUND_FULL_WINDOW_DAYS = 7;
export const DEFAULT_REFUND_DUAL_APPROVAL_ABOVE = 500;

const DAY = 86_400_000;
const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
export const toCents = (value: unknown) => Math.round(Number(value) * 100);

const readNumber = (raw: string | undefined, fallback: number) => {
  const value = Number(raw);
  return raw !== undefined && raw.trim() !== '' && Number.isFinite(value) && value >= 0 ? value : fallback;
};
export const refundFullWindowDays = () => Math.floor(readNumber(process.env.REFUND_FULL_WINDOW_DAYS, DEFAULT_REFUND_FULL_WINDOW_DAYS));
export const refundDualApprovalAbove = () => readNumber(process.env.REFUND_DUAL_APPROVAL_ABOVE, DEFAULT_REFUND_DUAL_APPROVAL_ABOVE);

export interface RefundPolicyInput {
  kind: 'TOTAL' | 'PARTIAL';
  amount?: number;
  /** Valor pago da fatura, em reais. */
  paid: number;
  /** Saldo ainda devolvível: pago − já devolvido − pedidos em andamento. */
  available: number;
  paidAt: Date;
  cycle?: string | null;
  now?: Date;
  windowDays?: number;
}

const refuse = (message: string, suggestedAmount?: number) =>
  new BadRequestException(suggestedAmount === undefined ? message : { statusCode: 400, error: 'Bad Request', message, suggestedAmount });

/** Valor proporcional ao período não usado do ciclo anual, limitado ao saldo (em centavos, arredondado para baixo). */
export function suggestedProportionalCents(input: Pick<RefundPolicyInput, 'paid' | 'available' | 'paidAt' | 'now'>) {
  const now = (input.now ?? new Date()).getTime();
  const start = new Date(input.paidAt);
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  const total = end.getTime() - start.getTime();
  const unusedFraction = Math.min(1, Math.max(0, (end.getTime() - now) / total));
  const unusedCents = Math.floor(toCents(input.paid) * unusedFraction + 1e-9);
  const alreadyOut = toCents(input.paid) - toCents(input.available);
  return Math.max(0, Math.min(toCents(input.available), unusedCents - alreadyOut));
}

/** Aplica a política de reembolso e devolve o valor aprovado para o pedido. Lança 400 em português se violar. */
export function applyRefundPolicy(input: RefundPolicyInput): number {
  const availableCents = toCents(input.available);
  if (availableCents <= 0) throw refuse('Esta fatura não tem saldo disponível para reembolso (já devolvido ou com pedidos em andamento).');
  const now = input.now ?? new Date();
  const windowDays = input.windowDays ?? refundFullWindowDays();
  const days = Math.floor((now.getTime() - new Date(input.paidAt).getTime()) / DAY);
  const withinWindow = days <= windowDays;
  const requested = input.amount === undefined ? undefined : toCents(input.amount);

  if (input.kind === 'PARTIAL') {
    if (requested === undefined || !Number.isFinite(requested) || requested <= 0) throw refuse('Informe o valor do reembolso parcial.');
    if (Math.abs(Number(input.amount) * 100 - requested) > 1e-6) throw refuse('O valor deve ter no máximo duas casas decimais.');
  }

  if (withinWindow) {
    if (input.kind === 'TOTAL') return availableCents / 100;
    if (requested! > availableCents) throw refuse(`O valor excede o saldo disponível para reembolso. Máximo: ${brl(availableCents)}.`, availableCents / 100);
    return requested! / 100;
  }

  const suggested = suggestedProportionalCents(input);
  if (input.kind === 'TOTAL') {
    throw refuse(`O reembolso total só é possível até ${windowDays} dia(s) após o pagamento (já se passaram ${days}). ${input.cycle === 'YEARLY' && suggested > 0 ? `Você pode solicitar reembolso parcial de até ${brl(suggested)}, proporcional ao período não utilizado.` : 'Fora desse prazo só há reembolso parcial para planos de ciclo anual.'}`, input.cycle === 'YEARLY' ? suggested / 100 : undefined);
  }
  if (input.cycle !== 'YEARLY') throw refuse(`Passaram-se mais de ${windowDays} dia(s) desde o pagamento. Fora desse prazo o reembolso parcial só é possível para planos de ciclo anual.`);
  if (suggested <= 0) throw refuse('Não há período não utilizado no ciclo anual desta fatura; não é possível reembolsar.', 0);
  if (requested! > suggested) throw refuse(`Fora do prazo de ${windowDays} dia(s), o reembolso é proporcional ao período não utilizado. Valor máximo: ${brl(suggested)}.`, suggested / 100);
  return requested! / 100;
}
