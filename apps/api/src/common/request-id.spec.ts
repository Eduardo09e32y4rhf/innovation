import { describe, expect, it } from 'vitest';
import { requestIdOf, resolveRequestId, responseMeta } from './request-id';

describe('request-id', () => {
  it('reaproveita um ID seguro vindo do proxy', () => {
    expect(resolveRequestId('abc12345-req')).toBe('abc12345-req');
    expect(resolveRequestId(['abc12345-req', 'x'])).toBe('abc12345-req');
  });

  it('gera novo ID quando o enviado é inseguro, curto, longo ou ausente', () => {
    for (const bad of ['curto', 'tem espaco aqui', 'x\r\nSet-Cookie: a=b', 'a'.repeat(65), undefined, 42]) {
      const id = resolveRequestId(bad);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('responseMeta devolve requestId e timestamp ISO', () => {
    const meta = responseMeta({ id: 'req-12345678' });
    expect(meta.requestId).toBe('req-12345678');
    expect(new Date(meta.timestamp).toISOString()).toBe(meta.timestamp);
    expect(requestIdOf({})).toBeNull();
  });
});
