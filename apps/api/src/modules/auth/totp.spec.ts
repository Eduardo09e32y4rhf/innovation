import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, generateRecoveryCodes, hashRecoveryCode, hotp, otpauthUrl, totp, verifyTotp } from './totp';

describe('TOTP (RFC 6238)', () => {
  // Vetores oficiais da RFC 6238 (SHA-1, segredo ASCII "12345678901234567890"), 6 dígitos = últimos 6 dos 8 da RFC.
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  it('gera os códigos de referência da RFC', () => {
    expect(totp(secret, 59_000)).toBe('287082');
    expect(totp(secret, 1_111_111_109_000)).toBe('081804');
    expect(totp(secret, 1_234_567_890_000)).toBe('005924');
    expect(totp(secret, 2_000_000_000_000)).toBe('279037');
  });

  it('base32 faz ida e volta', () => {
    const raw = Buffer.from('segredo-teste-123');
    expect(base32Decode(base32Encode(raw)).equals(raw)).toBe(true);
    expect(() => base32Decode('1!!')).toThrow();
  });

  it('aceita a janela de ±1 passo e rejeita fora dela ou formato inválido', () => {
    const now = 1_700_000_000_000;
    const current = totp(secret, now);
    expect(verifyTotp(secret, current, now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now + 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now - 120_000), now)).toBe(false);
    expect(verifyTotp(secret, '12345', now)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', now)).toBe(false);
  });

  it('hotp é determinístico', () => {
    expect(hotp(Buffer.from('12345678901234567890'), 0)).toBe('755224');
  });

  it('gera URL otpauth e códigos de recuperação únicos e hasheáveis', () => {
    expect(otpauthUrl('ABC', 'a@b.com')).toContain('secret=ABC');
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(8);
    expect(codes[0]).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect(hashRecoveryCode(codes[0])).toBe(hashRecoveryCode(codes[0].toLowerCase().replace('-', ' ')));
  });
});
