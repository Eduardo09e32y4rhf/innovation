import { describe, expect, it } from 'vitest';
import { prorateUpgrade } from './proration';

const start = new Date('2026-10-01T00:00:00Z');
const end = new Date('2026-10-31T00:00:00Z');

describe('rateio por dia', () => {
  it('upgrade cobra a diferença proporcional aos dias restantes', () => {
    const r = prorateUpgrade({ currentTotal: 300, nextTotal: 600, periodStart: start, periodEnd: end, now: new Date('2026-10-16T00:00:00Z') });
    expect(r).toEqual({ amount: 150, remainingDays: 15, cycleDays: 30 });
  });

  it('downgrade não gera cobrança nem crédito', () => {
    const r = prorateUpgrade({ currentTotal: 600, nextTotal: 300, periodStart: start, periodEnd: end, now: new Date('2026-10-16T00:00:00Z') });
    expect(r.amount).toBe(0);
  });

  it('ciclo vencido não cobra', () => {
    const r = prorateUpgrade({ currentTotal: 300, nextTotal: 600, periodStart: start, periodEnd: end, now: new Date('2026-11-05T00:00:00Z') });
    expect(r.amount).toBe(0);
    expect(r.remainingDays).toBe(0);
  });

  it('arredonda em centavos e sem início assume ciclo de 30 dias', () => {
    const r = prorateUpgrade({ currentTotal: 100, nextTotal: 110, periodEnd: end, now: new Date('2026-10-28T00:00:00Z') });
    expect(r).toEqual({ amount: 1, remainingDays: 3, cycleDays: 30 });
  });
});
