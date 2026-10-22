import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { toPlainJson } from './plain-json.interceptor';

describe('toPlainJson', () => {
  it('Decimal vira number (nunca string) em qualquer profundidade', () => {
    const out: any = toPlainJson({
      amount: new Prisma.Decimal('199.90'),
      nested: { refundedAmount: new Prisma.Decimal(0), items: [{ value: new Prisma.Decimal('0.1') }] },
    });
    expect(out.amount).toBe(199.9);
    expect(out.nested.refundedAmount).toBe(0);
    expect(out.nested.items[0].value).toBe(0.1);
  });

  it('datas viram ISO e null/undefined são preservados como no JSON', () => {
    const out: any = toPlainJson({ paidAt: new Date('2026-01-02T03:04:05.000Z'), none: null, skipped: undefined });
    expect(out.paidAt).toBe('2026-01-02T03:04:05.000Z');
    expect(out.none).toBeNull();
    expect('skipped' in out).toBe(false);
  });

  it('arrays de faturas mantêm a ordem e convertem cada valor', () => {
    const out: any = toPlainJson([{ amount: new Prisma.Decimal('10.5') }, { amount: new Prisma.Decimal('20') }]);
    expect(out.map((row: any) => row.amount)).toEqual([10.5, 20]);
  });
});
