import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { decimalsToNumbers } from './response.interceptor';

class Entity { secret = 'x'; amount = new Prisma.Decimal('1.50'); }

describe('decimalsToNumbers', () => {
  it('converts nested Prisma.Decimal to number in plain objects and arrays', () => {
    const out = decimalsToNumbers({ netPay: new Prisma.Decimal('1234.56'), rows: [{ v: new Prisma.Decimal('0.1') }], at: new Date(0), n: null });
    expect(out).toEqual({ netPay: 1234.56, rows: [{ v: 0.1 }], at: new Date(0), n: null });
  });

  it('leaves class instances untouched so serializer metadata is preserved', () => {
    const entity = new Entity();
    expect(decimalsToNumbers({ entity })).toEqual({ entity });
    expect((decimalsToNumbers({ entity }) as any).entity).toBe(entity);
  });
});
