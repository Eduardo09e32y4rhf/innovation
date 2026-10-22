import { describe, expect, it } from 'vitest';
import {
  canRateTicket, canReopenResolved, getRefundStatusLabel, isWithinFullWindow, listRefundableInvoices, nextStarScore,
  parseAmount, refundDecisionActions, refundDecisionError, showRatingBlock, validateRefundForm,
} from '../../../apps/web/app/components/support/refund-model';

const NOW = new Date('2026-10-22T12:00:00Z').getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe('reembolso: status em linguagem do cliente', () => {
  it.each([
    ['REQUESTED', 'Solicitado'], ['AWAITING_SECOND_APPROVAL', 'Aguardando 2ª aprovação'], ['APPROVED', 'Aprovado'],
    ['PROCESSING', 'Em processamento'], ['CONFIRMED', 'Confirmado'], ['REJECTED', 'Recusado'], ['FAILED', 'Falhou'],
  ])('%s -> %s', (s, label) => expect(getRefundStatusLabel(s)).toBe(label));
  it('vazio quando não há reembolso', () => expect(getRefundStatusLabel(null)).toBe(''));
});

describe('reembolso: botões da plataforma', () => {
  const t = (o: object) => ({ refundStatus: 'REQUESTED', createdByUserId: 'cli', refundDecisionById: null, ...o }) as any;
  it('empresa nunca vê os botões', () => expect(refundDecisionActions(t({}), 'dev', false)).toEqual({ canApprove: false, canReject: false }));
  it('plataforma vê aprovar e recusar em pedido solicitado', () => expect(refundDecisionActions(t({}), 'dev', true)).toEqual({ canApprove: true, canReject: true }));
  it('quem pediu não decide', () => expect(refundDecisionActions(t({}), 'cli', true)).toMatchObject({ canApprove: false, canReject: false }));
  it('quem deu a 1ª aprovação não aprova de novo, mas pode recusar', () => {
    const r = refundDecisionActions(t({ refundStatus: 'AWAITING_SECOND_APPROVAL', refundDecisionById: 'dev' }), 'dev', true);
    expect(r).toMatchObject({ canApprove: false, canReject: true });
    expect(r.hint).toMatch(/outra pessoa/);
  });
  it('outra pessoa dá a 2ª aprovação', () => expect(refundDecisionActions(t({ refundStatus: 'AWAITING_SECOND_APPROVAL', refundDecisionById: 'dev' }), 'ceo', true).canApprove).toBe(true));
  it.each(['APPROVED', 'PROCESSING', 'CONFIRMED', 'REJECTED', 'FAILED', null])('sem botões em %s', (s) => expect(refundDecisionActions(t({ refundStatus: s }), 'dev', true).canApprove).toBe(false));
  it('traduz o 409 da segunda aprovação', () => {
    expect(refundDecisionError({ status: 409, message: 'A segunda aprovação precisa ser de outro usuário.' })).toBe('A segunda aprovação precisa ser de outra pessoa.');
    expect(refundDecisionError({ status: 409, message: 'O pedido foi alterado.' })).toBe('O pedido foi alterado.');
    expect(refundDecisionError({ status: 500, message: 'Falha' })).toBe('Falha');
  });
});

describe('reembolso: faturas e formulário', () => {
  it('lista só pagas com saldo, mais recentes primeiro', () => {
    const r = listRefundableInvoices([
      { id: 'a', status: 'PAID', amount: 100, paidAt: daysAgo(10) },
      { id: 'b', status: 'OPEN', amount: 100 },
      { id: 'c', status: 'PAID', amount: 100, refundedAmount: 100, paidAt: daysAgo(1) },
      { id: 'd', status: 'PAID', amount: '200', refundedAmount: '50', paidAt: daysAgo(2) },
    ]);
    expect(r.map((i) => i.id)).toEqual(['d', 'a']);
  });
  it('janela de 7 dias', () => {
    expect(isWithinFullWindow(daysAgo(7), NOW)).toBe(true);
    expect(isWithinFullWindow(daysAgo(8), NOW)).toBe(false);
    expect(isWithinFullWindow(null, NOW)).toBe(false);
  });
  it.each([['1.234,56', 1234.56], ['150', 150], ['12,5', 12.5], ['12.5', 12.5]])('parseAmount %s', (t, n) => expect(parseAmount(t)).toBe(n));
  it('parseAmount inválido', () => expect(parseAmount('abc')).toBeNaN());
  it('valida o formulário', () => {
    const ok = { invoiceId: 'i', kind: 'TOTAL' as const, amountText: '', reason: 'Cobrança duplicada', available: 100 };
    expect(validateRefundForm(ok)).toBeNull();
    expect(validateRefundForm({ ...ok, invoiceId: '' })).toMatch(/fatura/i);
    expect(validateRefundForm({ ...ok, reason: 'abc' })).toMatch(/motivo/i);
    expect(validateRefundForm({ ...ok, kind: 'PARTIAL' })).toMatch(/valor/i);
    expect(validateRefundForm({ ...ok, kind: 'PARTIAL', amountText: '150' })).toMatch(/saldo/i);
    expect(validateRefundForm({ ...ok, kind: 'PARTIAL', amountText: '50,00' })).toBeNull();
  });
});

describe('avaliação e reabertura', () => {
  const t = (o: object) => ({ status: 'RESOLVED', createdByUserId: 'u1', satisfactionScore: null, resolvedAt: daysAgo(2), closedAt: null, ...o }) as any;
  it('só quem abriu avalia, quando resolvido/encerrado e sem nota', () => {
    expect(canRateTicket(t({}), 'u1')).toBe(true);
    expect(canRateTicket(t({ status: 'CLOSED' }), 'u1')).toBe(true);
    expect(canRateTicket(t({}), 'u2')).toBe(false);
    expect(canRateTicket(t({ status: 'IN_PROGRESS' }), 'u1')).toBe(false);
    expect(canRateTicket(t({ satisfactionScore: 4 }), 'u1')).toBe(false);
  });
  it('bloco aparece com nota mesmo após reabrir', () => {
    expect(showRatingBlock(t({}), 'u2')).toBe(false);
    expect(showRatingBlock(t({ status: 'OPEN' }), 'u1')).toBe(false);
    expect(showRatingBlock(t({ status: 'REOPENED', satisfactionScore: 5 }), 'u1')).toBe(true);
  });
  it('reabrir até 7 dias', () => {
    expect(canReopenResolved(t({}), NOW)).toBe(true);
    expect(canReopenResolved(t({ resolvedAt: daysAgo(8) }), NOW)).toBe(false);
    expect(canReopenResolved(t({ status: 'CLOSED', resolvedAt: null, closedAt: daysAgo(3) }), NOW)).toBe(true);
    expect(canReopenResolved(t({ status: 'OPEN' }), NOW)).toBe(false);
  });
  it('teclas das estrelas', () => {
    expect(nextStarScore(0, 'ArrowRight')).toBe(1);
    expect(nextStarScore(5, 'ArrowRight')).toBe(5);
    expect(nextStarScore(1, 'ArrowLeft')).toBe(1);
    expect(nextStarScore(3, 'End')).toBe(5);
    expect(nextStarScore(3, 'Home')).toBe(1);
    expect(nextStarScore(3, 'a')).toBeNull();
  });
});
