import { createHash, randomBytes } from 'node:crypto';
import { ALLOW, inspectFile } from '../../common/utils/file-validation';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_REQUEST_ITEMS = 80;
export const DEFAULT_LINK_DAYS = 7;
export const MAX_LINK_DAYS = 30;

/** Tipo real pelo conteudo (assinatura binaria), nunca pela extensao ou pelo Content-Type informado. */
export function detectDocumentType(buffer: Buffer): { mime: string; extension: string } | null {
  const checked = inspectFile(buffer, { allow: ALLOW.DOCUMENT, maxBytes: Number.MAX_SAFE_INTEGER });
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

/** Documentos pedidos na contratacao, conforme o contrato (CLT ou PJ). O RH pode pedir outros depois, pelo catalogo completo. */
export const HIRE_DOCUMENT_KITS = {
  CLT: ['RG ou CNH', 'CPF', 'Título de eleitor', 'Carteira de trabalho (CTPS)', 'PIS/PASEP/NIS', 'Comprovante de residência', 'Certidão de nascimento ou casamento', 'Comprovante de escolaridade', 'Foto 3x4', 'Dados bancários (comprovante de conta)', 'Certificado de reservista (homens)', 'Documentos dos dependentes (se houver)'],
  PJ: ['Cartão CNPJ', 'Contrato social ou certificado MEI (CCMEI)', 'RG ou CNH do sócio', 'CPF do sócio', 'Comprovante de endereço da empresa', 'Dados bancários da empresa (PJ)', 'Certidão negativa de débitos federais', 'Inscrição municipal'],
} as const;

export function hireKitFor(contractType?: string | null): string[] {
  const key = String(contractType ?? '').toUpperCase();
  return [...(key.includes('PJ') || key.includes('MEI') || key.includes('PRESTA') ? HIRE_DOCUMENT_KITS.PJ : HIRE_DOCUMENT_KITS.CLT)];
}
