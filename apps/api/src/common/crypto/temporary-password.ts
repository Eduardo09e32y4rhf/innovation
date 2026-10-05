import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

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
export function generateTemporaryPassword(): string {
  return `Aa1!${randomBytes(12).toString('base64url')}`;
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