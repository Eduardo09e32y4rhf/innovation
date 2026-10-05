import { createHash, randomBytes } from 'node:crypto';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_REQUEST_ITEMS = 15;
export const DEFAULT_LINK_DAYS = 7;
export const MAX_LINK_DAYS = 30;

/** Tipo real pelo conteudo (assinatura binaria), nunca pela extensao ou pelo Content-Type informado. */
export function detectDocumentType(buffer: Buffer): { mime: string; extension: string } | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', extension: 'pdf' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', extension: 'png' };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', extension: 'jpg' };
  return null;
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