import { describe, expect, it } from 'vitest';
import { currentByLabel, forwardReadiness, parseItemsInput, publicDocumentsUrl, type DocumentRow, type RequestRow } from '../../../apps/web/app/[tenant]/dashboard/jobs/_components/documents-model';

const doc = (label: string, status: DocumentRow['status'], over: Partial<DocumentRow> = {}): DocumentRow => ({ id: `${label}-${status}`, requestId: 'r', label, status, fileName: 'f.pdf', mimeType: 'application/pdf', size: 1, returnReason: null, reviewedAt: null, supersededAt: null, createdAt: '2026-10-08', ...over });
const req = (items: string[]): RequestRow => ({ id: 'r', items, expiresAt: '2026-10-20', revokedAt: null, createdAt: '2026-10-08', state: 'ACTIVE' });

describe('itens do pedido', () => {
  it('aceita linhas, virgulas e ponto e virgula; remove duplicados, curtos e longos', () => {
    expect(parseItemsInput('RG\nCPF, comprovante de residência; rg\nx\n' + 'a'.repeat(61))).toEqual(['RG', 'CPF', 'comprovante de residência']);
    expect(parseItemsInput('')).toEqual([]);
    expect(parseItemsInput(Array.from({ length: 30 }, (_, i) => `Doc ${i}`).join('\n'))).toHaveLength(15);
  });
});

describe('versao vigente e prontidao', () => {
  it('ignora versoes substituidas', () => {
    const map = currentByLabel([doc('RG', 'RETURNED', { supersededAt: '2026-10-09' }), doc('RG', 'RECEIVED')]);
    expect(map.get('RG')?.status).toBe('RECEIVED');
  });
  it('pronto so com todos aprovados; sem itens nao e pronto', () => {
    expect(forwardReadiness([req(['RG', 'CPF'])], [doc('RG', 'APPROVED'), doc('CPF', 'APPROVED')]).ready).toBe(true);
    expect(forwardReadiness([], []).ready).toBe(false);
  });
  it('faltando, recebido e devolvido bloqueiam e sao listados', () => {
    const r = forwardReadiness([req(['RG', 'CPF', 'CTPS', 'Foto'])], [doc('RG', 'RECEIVED'), doc('CPF', 'RETURNED'), doc('CTPS', 'APPROVED')]);
    expect(r).toMatchObject({ ready: false, missing: ['Foto'], pending: ['RG'], returned: ['CPF'], total: 4 });
  });
  it('item aprovado numa versao antiga substituida por devolvida nao conta como aprovado', () => {
    const r = forwardReadiness([req(['RG'])], [doc('RG', 'APPROVED', { supersededAt: '2026-10-09' }), doc('RG', 'RETURNED')]);
    expect(r.ready).toBe(false);
  });
});

describe('link publico', () => {
  it('monta a URL sem barras duplicadas', () => {
    expect(publicDocumentsUrl('https://app.exemplo.com/', '/carreiras/documentos/abc')).toBe('https://app.exemplo.com/carreiras/documentos/abc');
  });
});