import { computeAuditHash, sanitizeForAudit } from './platform-audit.service';

describe('sanitizeForAudit', () => {
  it('oculta segredos em qualquer nível', () => {
    const out = sanitizeForAudit({ name: 'x', password: '123', nested: { apiKey: 'k', accessToken: 't', ok: 1 } }) as Record<string, unknown>;
    expect(out.password).toBe('[oculto]');
    expect((out.nested as Record<string, unknown>).apiKey).toBe('[oculto]');
    expect((out.nested as Record<string, unknown>).accessToken).toBe('[oculto]');
    expect((out.nested as Record<string, unknown>).ok).toBe(1);
    expect(out.name).toBe('x');
  });
  it('trunca textos longos e lida com null', () => {
    expect((sanitizeForAudit('a'.repeat(900)) as string).length).toBeLessThan(510);
    expect(sanitizeForAudit(undefined)).toBeNull();
  });
});

describe('computeAuditHash', () => {
  const row = { id: 'i1', createdAt: new Date('2026-10-05T10:00:00.000Z'), action: 'A', entity: 'E', entityId: '1', actorId: 'u', actorRole: 'DEV', after: { b: 2, a: 1 } };

  it('é determinístico e independe da ordem das chaves', () => {
    const a = computeAuditHash('GENESIS', row);
    const b = computeAuditHash('GENESIS', { ...row, after: { a: 1, b: 2 } });
    expect(a).toBe(b);
  });
  it('muda se qualquer campo ou o hash anterior mudar (cadeia)', () => {
    const original = computeAuditHash('GENESIS', row);
    expect(computeAuditHash('OUTRO', row)).not.toBe(original);
    expect(computeAuditHash('GENESIS', { ...row, action: 'B' })).not.toBe(original);
    expect(computeAuditHash('GENESIS', { ...row, after: { a: 1, b: 3 } })).not.toBe(original);
  });
});
