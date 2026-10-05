import { describe, expect, it } from 'vitest';
import { detectDocumentType, evaluateForwardReadiness, generateAccessToken, hashAccessToken, linkState, normalizeItems, safeDownloadName } from './recruitment-documents.rules';

const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(20)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);

describe('tipo do arquivo pelo conteudo', () => {
  it('aceita PDF, PNG e JPEG verdadeiros', () => {
    expect(detectDocumentType(pdf)?.mime).toBe('application/pdf');
    expect(detectDocumentType(png)?.mime).toBe('image/png');
    expect(detectDocumentType(jpg)?.mime).toBe('image/jpeg');
  });
  it('rejeita executavel, HTML, SVG, ZIP e arquivo vazio mesmo com nome/extensao enganosos', () => {
    for (const bad of [Buffer.from('MZ\x90\x00'), Buffer.from('<html><script>'), Buffer.from('<svg xmlns='), Buffer.from('PK\x03\x04'), Buffer.alloc(0), Buffer.from('%PD')]) expect(detectDocumentType(bad)).toBeNull();
  });
});

describe('token de acesso', () => {
  it('gera tokens unicos e guarda so o hash SHA-256', () => {
    const a = generateAccessToken(); const b = generateAccessToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(43);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).toBe(hashAccessToken(a.token));
    expect(a.hash).not.toContain(a.token);
  });
});

describe('itens do pedido', () => {
  it('normaliza, remove duplicados (sem diferenciar caixa), controles e itens invalidos', () => {
    expect(normalizeItems([' RG ', 'rg', 'Comprovante  de\nresidência', 'x', 'a'.repeat(61), 7, ''])).toEqual(['RG', 'Comprovante de residência']);
    expect(normalizeItems('RG')).toEqual([]);
    expect(normalizeItems(Array.from({ length: 40 }, (_, i) => `Documento ${i}`))).toHaveLength(15);
  });
});

describe('estado do link', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  it('ativo, expirado (inclusive no instante) e revogado', () => {
    expect(linkState({ expiresAt: new Date('2026-10-09T00:00:00Z') }, now)).toBe('ACTIVE');
    expect(linkState({ expiresAt: now }, now)).toBe('EXPIRED');
    expect(linkState({ expiresAt: new Date('2026-10-20T00:00:00Z'), revokedAt: now }, now)).toBe('REVOKED');
  });
});

describe('prontidao para encaminhar', () => {
  const m = (entries: Array<[string, 'RECEIVED' | 'APPROVED' | 'RETURNED']>) => new Map(entries.map(([k, s]) => [k, { status: s }]));
  it('so com todos os itens aprovados', () => {
    expect(evaluateForwardReadiness(['RG', 'CPF'], m([['RG', 'APPROVED'], ['CPF', 'APPROVED']])).ready).toBe(true);
  });
  it('sem itens pedidos, faltando, nao conferido ou devolvido bloqueia', () => {
    expect(evaluateForwardReadiness([], m([])).ready).toBe(false);
    const r = evaluateForwardReadiness(['RG', 'CPF', 'CTPS', 'Foto'], m([['RG', 'RECEIVED'], ['CPF', 'RETURNED'], ['CTPS', 'APPROVED']]));
    expect(r).toMatchObject({ ready: false, missing: ['Foto'], pending: ['RG'], returned: ['CPF'] });
  });
});

describe('nome de download', () => {
  it('remove acentos e caracteres de caminho', () => {
    expect(safeDownloadName('Comprovante de residência', 'pdf')).toBe('Comprovante-de-residencia.pdf');
    expect(safeDownloadName('../../etc/passwd', 'png')).toBe('etc-passwd.png');
    expect(safeDownloadName('***', 'jpg')).toBe('documento.jpg');
  });
});