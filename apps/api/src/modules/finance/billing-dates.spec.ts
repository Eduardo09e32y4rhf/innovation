import { describe, expect, it } from 'vitest';
import { saoPauloDaysOverdue, saoPauloTomorrow } from './billing-dates';

const d = (iso: string) => new Date(iso);

describe('datas de cobranca em Brasilia (PAG-08)', () => {
  it('23:30 BRT gera vencimento de amanha em BRT (nao dois dias a frente)', () => {
    // 23:30 BRT de 10/mar = 02:30Z de 11/mar
    expect(saoPauloTomorrow(d('2026-03-11T02:30:00Z')).toISOString().slice(0, 10)).toBe('2026-03-11');
  });
  it('virada de mes e de ano', () => {
    expect(saoPauloTomorrow(d('2026-02-01T01:00:00Z')).toISOString().slice(0, 10)).toBe('2026-02-01'); // 22:00 BRT de 31/jan
    expect(saoPauloTomorrow(d('2027-01-01T02:00:00Z')).toISOString().slice(0, 10)).toBe('2027-01-01'); // 23:00 BRT de 31/dez
  });
  it('atraso conta dias em BRT', () => {
    const due = d('2026-03-10T00:00:00Z');
    expect(saoPauloDaysOverdue(due, d('2026-03-11T02:30:00Z'))).toBe(0); // ainda 10/mar em BRT
    expect(saoPauloDaysOverdue(due, d('2026-03-11T03:00:00Z'))).toBe(1);
    expect(saoPauloDaysOverdue(due, d('2026-03-08T12:00:00Z'))).toBe(-2);
  });
  it('atraso na virada de ano', () => {
    expect(saoPauloDaysOverdue(d('2026-12-31T00:00:00Z'), d('2027-01-01T12:00:00Z'))).toBe(1);
  });
});
