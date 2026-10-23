import { describe, expect, it, vi } from 'vitest';
import { SupportRepository } from './support.repository';

describe('protocolo AAAAMMDD0000', () => {
  function setup() {
    const counters = new Map<number, number>();
    const upsert = vi.fn(async ({ where }: { where: { year: number } }) => {
      const lastNumber = (counters.get(where.year) ?? 0) + 1;
      counters.set(where.year, lastNumber);
      return { lastNumber };
    });
    return new SupportRepository({ supportTicketCounter: { upsert } } as any);
  }

  it('começa em 0000, incrementa sem prefixos e reinicia no próximo dia de Brasília', async () => {
    const repository = setup();
    expect(await repository.generateTicketNumber(new Date('2026-10-23T03:00:00Z'))).toBe('202610230000');
    expect(await repository.generateTicketNumber(new Date('2026-10-24T02:59:00Z'))).toBe('202610230001');
    expect(await repository.generateTicketNumber(new Date('2026-10-24T03:00:00Z'))).toBe('202610240000');
  });

  it('reserva protocolos distintos para solicitações simultâneas', async () => {
    const repository = setup();
    const numbers = await Promise.all(Array.from({ length: 100 }, () => repository.generateTicketNumber(new Date('2026-10-23T12:00:00Z'))));
    expect(new Set(numbers).size).toBe(100);
    expect(numbers.every((number) => /^20261023\d{4}$/.test(number))).toBe(true);
  });
});
