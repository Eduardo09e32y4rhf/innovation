import { toDateOnly } from './date.utils';

describe('date utils - calendario de Sao Paulo', () => {
  it('nao vira o dia antes da meia-noite em Sao Paulo', () => {
    const atTenPmInSaoPaulo = new Date('2026-07-18T01:00:00.000Z');
    expect(toDateOnly(atTenPmInSaoPaulo).toISOString()).toBe('2026-07-17T00:00:00.000Z');
  });

  it('vira o dia exatamente depois da meia-noite em Sao Paulo', () => {
    const afterMidnightInSaoPaulo = new Date('2026-07-18T03:05:00.000Z');
    expect(toDateOnly(afterMidnightInSaoPaulo).toISOString()).toBe('2026-07-18T00:00:00.000Z');
  });
});
