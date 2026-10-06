export type DocStatus = 'RECEIVED' | 'APPROVED' | 'RETURNED';

export type DocumentRow = {
  id: string; requestId: string; label: string; status: DocStatus; fileName: string; mimeType: string; size: number;
  returnReason: string | null; reviewedAt: string | null; supersededAt: string | null; createdAt: string;
};
export type RequestRow = { id: string; items: string[]; expiresAt: string; revokedAt: string | null; createdAt: string; state: 'ACTIVE' | 'EXPIRED' | 'REVOKED' };
export type DocumentsPayload = { selectedAt: string | null; forwardedAt: string | null; requests: RequestRow[]; documents: DocumentRow[] };
export type CreatedRequest = { id: string; items: string[]; expiresAt: string; token: string; path: string };

export const DOC_STATUS_LABEL: Record<DocStatus | 'PENDING', string> = {
  PENDING: 'Aguardando envio',
  RECEIVED: 'Recebido, falta conferir',
  APPROVED: 'Aprovado',
  RETURNED: 'Devolvido ao candidato',
};

/** Um documento por linha (ou separados por virgula/ponto e virgula). O servidor normaliza de novo. */
export function parseItemsInput(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\n,;]+/)) {
    const label = part.replace(/\s+/g, ' ').trim();
    if (label.length < 2 || label.length > 60) continue;
    const key = label.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.slice(0, 15);
}

/** Versao vigente de cada item: a mais recente que nao foi substituida. */
export function currentByLabel(documents: DocumentRow[]): Map<string, DocumentRow> {
  const map = new Map<string, DocumentRow>();
  for (const doc of documents) if (!doc.supersededAt && !map.has(doc.label)) map.set(doc.label, doc);
  return map;
}

export function requestedLabels(requests: RequestRow[]): string[] {
  return [...new Set(requests.flatMap((request) => request.items))];
}

/** Espelha a regra do servidor: so e possivel encaminhar com todos os itens pedidos aprovados. */
export function forwardReadiness(requests: RequestRow[], documents: DocumentRow[]) {
  const labels = requestedLabels(requests);
  const current = currentByLabel(documents);
  const missing = labels.filter((label) => !current.has(label));
  const pending = labels.filter((label) => current.get(label)?.status === 'RECEIVED');
  const returned = labels.filter((label) => current.get(label)?.status === 'RETURNED');
  return { ready: labels.length > 0 && !missing.length && !pending.length && !returned.length, missing, pending, returned, total: labels.length };
}

export function publicDocumentsUrl(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}