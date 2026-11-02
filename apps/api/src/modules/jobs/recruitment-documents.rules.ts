import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { CONTRACT_KITS, kitFor } from './recruitment-doc-types';
import { ALLOW, inspectFile, type FileKind } from '../../common/utils/file-validation';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_REQUEST_ITEMS = 80;
export const DEFAULT_LINK_DAYS = 7;
export const MAX_LINK_DAYS = 30;

/** Tipo real pelo conteudo (assinatura binaria), nunca pela extensao ou pelo Content-Type informado. */
export function detectDocumentType(buffer: Buffer, formats: readonly FileKind[] = ALLOW.DOCUMENT): { mime: string; extension: string } | null {
  const checked = inspectFile(buffer, { allow: formats, maxBytes: Number.MAX_SAFE_INTEGER });
  return checked.ok ? { mime: checked.mime, extension: checked.extension } : null;
}

/** O token bruto so existe na resposta da criacao; o banco guarda apenas o SHA-256. */
export function generateAccessToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashAccessToken(token) };
}

export function hashAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Itens pedidos ao candidato: texto curto, sem caracteres de controle, sem repeticao. */
export function normalizeItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    if (typeof raw !== 'string') continue;
    const label = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (label.length < 2 || label.length > 60) continue;
    const key = label.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.slice(0, MAX_REQUEST_ITEMS);
}

export const CODE_MINUTES = 10;
export const CODE_COOLDOWN_SECONDS = 60;
export const CODE_MAX_ATTEMPTS = 5;

/** Codigo de 6 digitos (CSPRNG). So o hash (amarrado ao id do link) vai para o banco. */
export function generateVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashVerificationCode(requestId: string, code: string): string {
  return createHash('sha256').update(`${requestId}:${code}`).digest('hex');
}

export function codeMatches(requestId: string, code: string, storedHash: string): boolean {
  const given = Buffer.from(hashVerificationCode(requestId, String(code ?? '').trim()), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return given.length === stored.length && timingSafeEqual(given, stored);
}

/** a***@dominio.com: mostra onde o codigo foi sem expor o e-mail inteiro a quem so tem o link. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${(user ?? '').slice(0, 1)}***@${domain ?? ''}`;
}

export type LinkState = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export function linkState(request: { expiresAt: Date; revokedAt?: Date | null }, now: Date = new Date()): LinkState {
  if (request.revokedAt) return 'REVOKED';
  return request.expiresAt.getTime() > now.getTime() ? 'ACTIVE' : 'EXPIRED';
}

export type LatestDocument = { status: 'RECEIVED' | 'APPROVED' | 'RETURNED' };

/**
 * Encaminhar ao RH da empresa exige que TODO item pedido tenha o documento mais recente aprovado.
 * Item sem envio, recebido (nao conferido) ou devolvido bloqueia.
 */
export function evaluateForwardReadiness(labels: string[], latestByLabel: Map<string, LatestDocument>) {
  const missing: string[] = [];
  const pending: string[] = [];
  const returned: string[] = [];
  for (const label of labels) {
    const doc = latestByLabel.get(label);
    if (!doc) missing.push(label);
    else if (doc.status === 'RECEIVED') pending.push(label);
    else if (doc.status === 'RETURNED') returned.push(label);
  }
  return { ready: labels.length > 0 && !missing.length && !pending.length && !returned.length, missing, pending, returned };
}

export function safeDownloadName(label: string, extension: string): string {
  const base = label.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'documento';
  return `${base}.${extension}`;
}

/** Kits por tipo de contrato (CLT, PJ, estagio, aprendiz, temporario): ver recruitment-doc-types.ts. Mantido aqui por compatibilidade. */
export const HIRE_DOCUMENT_KITS = CONTRACT_KITS;

export function hireKitFor(contractType?: string | null): string[] {
  return kitFor(contractType);
}
