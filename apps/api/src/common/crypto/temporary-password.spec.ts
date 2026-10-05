import { afterEach, describe, expect, it } from 'vitest';
import { generateTemporaryPassword, temporaryPasswordExpiry, temporaryPasswordTtlMs } from './temporary-password';

const strong = (p: string) => p.length >= 10 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

afterEach(() => { delete process.env.TEMPORARY_PASSWORD_TTL_HOURS; });

describe('credencial provisoria unica', () => {
  it('gera senhas fortes, longas e sem repeticao', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const p = generateTemporaryPassword();
      expect(strong(p)).toBe(true);
      expect(p.length).toBeGreaterThanOrEqual(20);
      seen.add(p);
    }
    expect(seen.size).toBe(500);
  });

  it('validade padrao 24 h; configuravel entre 1 e 168 h; valor invalido volta ao padrao', () => {
    expect(temporaryPasswordTtlMs()).toBe(24 * 3600_000);
    process.env.TEMPORARY_PASSWORD_TTL_HOURS = '48';
    expect(temporaryPasswordTtlMs()).toBe(48 * 3600_000);
    for (const bad of ['0', '-5', '500', 'abc', '']) { process.env.TEMPORARY_PASSWORD_TTL_HOURS = bad; expect(temporaryPasswordTtlMs()).toBe(24 * 3600_000); }
    expect(temporaryPasswordExpiry(new Date('2026-10-08T00:00:00Z')).toISOString()).toBe('2026-10-09T00:00:00.000Z');
  });
});