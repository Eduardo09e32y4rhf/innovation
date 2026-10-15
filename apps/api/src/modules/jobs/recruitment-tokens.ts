import { randomBytes } from 'node:crypto';

/** Link secreto dos e-mails do candidato (entrevista, horarios, proposta, teste): 32 caracteres base64url. */
export function newPublicToken(): string {
  return randomBytes(24).toString('base64url');
}

export function isPublicToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32}$/.test(value);
}

export const appBase = () => (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

/** Primeiro nome para as paginas publicas (nao expoe o nome completo para quem tiver so o link). */
export const firstName = (name: string | null | undefined) => String(name ?? '').trim().split(/\s+/)[0] || 'Candidato(a)';
