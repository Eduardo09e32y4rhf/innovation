import { describe, expect, it, vi } from 'vitest';
import { buildProtocol, generateUniqueProtocol, isProtocol, normalizeProtocolQuery } from './support-protocol';

describe('protocolo do chamado', () => {
  it('comeca com ano, mes e dia e tem 15 digitos', () => {
    const protocol = buildProtocol(new Date('2026-10-21T13:20:00.000Z'));
    expect(protocol).toMatch(/^20261021\d{7}$/);
    expect(isProtocol(protocol)).toBe(true);
  });

  it('usa o dia de Sao Paulo: 02h UTC de 22/10 ainda e 21/10 em Sao Paulo', () => {
    expect(buildProtocol(new Date('2026-10-22T02:00:00.000Z')).slice(0, 8)).toBe('20261021');
    expect(buildProtocol(new Date('2026-10-22T03:00:00.000Z')).slice(0, 8)).toBe('20261022');
  });

  it('usa so digitos, inclusive zeros a esquerda, na parte aleatoria', () => {
    const protocol = buildProtocol(new Date('2026-01-05T15:00:00.000Z'), () => 0);
    expect(protocol).toBe('202601050000000');
  });

  it('1.000 protocolos gerados no mesmo dia sao todos validos e quase todos distintos', () => {
    const now = new Date('2026-10-21T13:00:00.000Z');
    const set = new Set(Array.from({ length: 1000 }, () => buildProtocol(now)));
    expect([...set].every(isProtocol)).toBe(true);
    expect(set.size).toBeGreaterThan(990);
  });

  it('normaliza a digitacao do cliente (espacos, pontos, tracos)', () => {
    expect(normalizeProtocolQuery(' 2026.1021-1020121 ')).toBe('202610211020121');
    expect(normalizeProtocolQuery('abc')).toBe('');
  });

  it('a busca aceita o numero antigo SUP-AAAA-NNNNNN e o novo, e ignora lixo', async () => {
    const { protocolSearchTerm } = await import('./support-protocol');
    expect(protocolSearchTerm(' sup-2026-000123 ')).toBe('SUP-2026-000123');
    expect(protocolSearchTerm('2026 1021')).toBe('20261021');
    expect(protocolSearchTerm('  ')).toBe('');
    expect(protocolSearchTerm('%;--')).toBe('');
  });

  it('tenta de novo quando o protocolo ja existe', async () => {
    const seq = [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2];
    let i = 0;
    const random = () => seq[i++];
    const taken = new Set(['202610211111111']);
    const exists = vi.fn(async (p: string) => taken.has(p));
    const protocol = await generateUniqueProtocol(exists, new Date('2026-10-21T13:00:00.000Z'), random);
    expect(protocol).toBe('202610212222222');
    expect(exists).toHaveBeenCalledTimes(2);
  });

  it('desiste depois de varias colisoes seguidas', async () => {
    await expect(generateUniqueProtocol(async () => true, new Date(), () => 3, 3)).rejects.toThrow('protocolo unico');
  });
});
