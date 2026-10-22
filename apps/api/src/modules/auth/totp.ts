import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** TOTP (RFC 6238 / RFC 4226): SHA-1, 6 dígitos, passo de 30 s — compatível com Google Authenticator, Authy, 1Password etc. */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0; let value = 0; let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0; let value = 0; const out: number[] = [];
  for (const ch of clean) {
    const index = B32.indexOf(ch);
    if (index < 0) throw new Error('Segredo base32 inválido.');
    value = (value << 5) | index; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const generateTotpSecret = () => base32Encode(randomBytes(20));

export function hotp(secret: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

export const totp = (secretBase32: string, atMs = Date.now(), stepSeconds = 30) => hotp(base32Decode(secretBase32), Math.floor(atMs / 1000 / stepSeconds));

/**
 * Devolve o passo (janela de 30 s) em que o código confere, ou null. Aceita o passo atual e ±1 (tolerância de relógio).
 * Quem chama deve guardar o passo para recusar o MESMO código de novo (RFC 6238 §5.2: o verificador não pode aceitar um OTP já usado).
 */
export function matchTotpStep(secretBase32: string, code: string, atMs = Date.now(), window = 1): number | null {
  const normalized = String(code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return null;
  const key = base32Decode(secretBase32);
  const step = Math.floor(atMs / 1000 / 30);
  let matched: number | null = null;
  for (let drift = -window; drift <= window; drift += 1) {
    const expected = Buffer.from(hotp(key, step + drift));
    if (timingSafeEqual(expected, Buffer.from(normalized))) matched = step + drift;
  }
  return matched;
}

export function verifyTotp(secretBase32: string, code: string, atMs = Date.now(), window = 1): boolean {
  return matchTotpStep(secretBase32, code, atMs, window) !== null;
}

export const otpauthUrl = (secret: string, account: string, issuer = 'Innovation RH Connect') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

/** Códigos de recuperação de uso único: XXXXX-XXXXX. */
export function generateRecoveryCodes(count = 8): string[] {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: count }, () => {
    const raw = Array.from(randomBytes(10), (byte) => alphabet[byte % alphabet.length]).join('');
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export const hashRecoveryCode = (code: string) => createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');
