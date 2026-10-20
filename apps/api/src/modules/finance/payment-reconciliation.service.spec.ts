import { describe, expect, it } from 'vitest';
import { classifyRemoteStatus, healingEvent } from './payment-reconciliation.service';

describe('classifyRemoteStatus', () => {
  it.each([
    ['RECEIVED', 'PAID'], ['CONFIRMED', 'PAID'], ['RECEIVED_IN_CASH', 'PAID'],
    ['OVERDUE', 'OVERDUE'], ['PENDING', 'OPEN'], ['AWAITING_RISK_ANALYSIS', 'OPEN'],
    ['REFUNDED', 'REFUND'], ['PARTIALLY_REFUNDED', 'REFUND'], ['REFUND_IN_PROGRESS', 'REFUND'],
    ['DELETED', 'CANCELED'], ['CHARGEBACK_REQUESTED', 'CANCELED'], ['CHARGEBACK_DISPUTE', 'CANCELED'],
    [undefined, 'UNKNOWN'],
  ])('%s -> %s', (status, expected) => expect(classifyRemoteStatus(status as string | undefined)).toBe(expected));
});

describe('healingEvent', () => {
  it('pago no Asaas e aberto/vencido/cancelado aqui -> recebido', () => {
    for (const local of ['OPEN', 'OVERDUE', 'CANCELED']) expect(healingEvent(local, 'PAID', 'RECEIVED')).toBe('PAYMENT_RECEIVED');
    expect(healingEvent('OPEN', 'PAID', 'CONFIRMED')).toBe('PAYMENT_CONFIRMED');
  });
  it('nunca regride uma fatura paga por estado aberto/vencido remoto', () => {
    expect(healingEvent('PAID', 'OPEN')).toBeNull();
    expect(healingEvent('PAID', 'OVERDUE')).toBeNull();
  });
  it('vencida remota so cura fatura aberta', () => {
    expect(healingEvent('OPEN', 'OVERDUE')).toBe('PAYMENT_OVERDUE');
    expect(healingEvent('OVERDUE', 'OVERDUE')).toBeNull();
  });
  it('cancelada remota: exclusao x chargeback; ja cancelada nao repete', () => {
    expect(healingEvent('OPEN', 'CANCELED', 'DELETED')).toBe('PAYMENT_DELETED');
    expect(healingEvent('PAID', 'CANCELED', 'CHARGEBACK_REQUESTED')).toBe('PAYMENT_CHARGEBACK_REQUESTED');
    expect(healingEvent('CANCELED', 'CANCELED', 'DELETED')).toBeNull();
  });
  it('estados iguais nao geram reparo', () => {
    expect(healingEvent('PAID', 'PAID', 'RECEIVED')).toBeNull();
    expect(healingEvent('OPEN', 'OPEN')).toBeNull();
  });
});
