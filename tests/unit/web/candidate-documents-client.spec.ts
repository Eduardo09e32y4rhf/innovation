import { describe, expect, it } from 'vitest';
import { canUpload, explainUploadError, validateDocumentFile } from '../../../apps/web/app/carreiras/documentos/[token]/documents-client';

describe('validacao previa do documento', () => {
  it('aceita PDF/PNG/JPEG ate 5 MB', () => {
    for (const name of ['rg.pdf', 'RG.PNG', 'foto.jpg', 'foto.JPEG']) expect(validateDocumentFile({ name, size: 1000 })).toBeNull();
    expect(validateDocumentFile({ name: 'a.pdf', size: 5 * 1024 * 1024 })).toBeNull();
  });
  it('recusa vazio, grande, extensao nao permitida e ausencia de arquivo', () => {
    expect(validateDocumentFile(null)).toMatch(/Escolha/);
    expect(validateDocumentFile({ name: 'a.pdf', size: 0 })).toMatch(/vazio/);
    expect(validateDocumentFile({ name: 'a.pdf', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
    for (const name of ['virus.exe', 'pagina.html', 'img.svg', 'arquivo', 'doc.docx']) expect(validateDocumentFile({ name, size: 10 })).toMatch(/PDF, PNG ou JPEG/);
  });
});

describe('mensagens', () => {
  it('link invalido nao diferencia expirado/revogado/inexistente', () => {
    expect(explainUploadError(404)).toMatch(/inválido ou expirou/);
  });
  it('documento aprovado nao permite novo envio', () => {
    expect(canUpload('APPROVED')).toBe(false);
    for (const s of ['PENDING', 'RECEIVED', 'RETURNED'] as const) expect(canUpload(s)).toBe(true);
  });
  it('erros de servico sao claros e nunca vazios', () => {
    for (const s of [409, 413, 422, 429, 503, 500]) expect(explainUploadError(s).length).toBeGreaterThan(10);
  });
});