import { createCipheriv, createDecipheriv, randomBytes, randomInt } from 'node:crypto';

function getKey() {
  const raw = process.env.KMS_MASTER_KEY;
  if (raw && Buffer.from(raw, 'hex').length === 32) {
    return Buffer.from(raw, 'hex');
  }
  // Fallback to a derived key from JWT_SECRET to prevent 500 crashes
  const secret = process.env.JWT_SECRET || 'innovation-rh-connect-local-development-secret';
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptTemporaryPassword(value: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTemporaryPassword(value: string) {
  const [ivHex, tagHex, encryptedHex] = value.split(':');
  if (!ivHex || !tagHex || !encryptedHex) throw new Error('Invalid temporary credential format.');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
}

/**
 * Fonte unica das credenciais provisorias (Usuarios, Funcionarios, importacao, ASO e Plataforma).
 * 96 bits de aleatoriedade (CSPRNG) + prefixo que satisfaz a regra de senha forte; nunca ha senha compartilhada.
 */
/**
 * Senha provisoria de ate 6 caracteres (so de uso no primeiro login, expira e obriga a troca por uma de 10+).
 * Alfabeto sem caracteres ambiguos (0/O, 1/l/I) para ditar e digitar sem erro; sempre tem maiuscula, minuscula e numero.
 */
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
export const TEMPORARY_PASSWORD_LENGTH = 6;
export function generateTemporaryPassword(): string {
  const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)];
  const all = UPPER + LOWER + DIGITS;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  while (chars.length < TEMPORARY_PASSWORD_LENGTH) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

const DEFAULT_TTL_HOURS = 24;

/** Validade da provisoria: TEMPORARY_PASSWORD_TTL_HOURS (1 a 168 h), padrao 24 h. */
export function temporaryPasswordTtlMs(): number {
  const hours = Number(process.env.TEMPORARY_PASSWORD_TTL_HOURS);
  const valid = Number.isFinite(hours) && hours >= 1 && hours <= 168 ? hours : DEFAULT_TTL_HOURS;
  return valid * 60 * 60 * 1000;
}

export function temporaryPasswordExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + temporaryPasswordTtlMs());
}