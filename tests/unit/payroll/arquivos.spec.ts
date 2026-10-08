import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { describe, expect, it } from 'vitest';
import { buildCsv } from '../../../apps/api/src/common/utils/csv';
import { contentDisposition } from '../../../apps/api/src/common/pdf/pdf-response';
// @ts-expect-error módulo .mjs compartilhado com o robô de API (sem tipos)
import { nomeDoArquivo, validarCsv, validarPdf } from '../../../tools/robo-api/lib/arquivos.mjs';

function gerarPdf(paginas = 1): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4' });
    const partes: Buffer[] = [];
    doc.on('data', (p: Buffer) => partes.push(p)).on('end', () => resolve(Buffer.concat(partes)));
    for (let i = 0; i < paginas; i++) { if (i) doc.addPage(); doc.fontSize(14).text(`Ficha do funcionário — página ${i + 1}\n`.repeat(30)); }
    doc.end();
  });
}
const boasHeaders = (buf: Buffer, nome = 'Ficha João.pdf') => ({
  'content-type': 'application/pdf', 'content-disposition': contentDisposition(nome), 'content-length': String(buf.length),
  'cache-control': 'private, no-store', 'x-document-sha256': createHash('sha256').update(buf).digest('hex'),
});

describe('validarPdf (o que o usuário recebe)', () => {
  it('PDF real gerado pelo sistema passa, com 1 ou várias páginas', async () => {
    for (const n of [1, 3]) { const pdf = await gerarPdf(n); expect(validarPdf(pdf, boasHeaders(pdf))).toEqual([]); }
  });
  it('pega PDF truncado, vazio, que não é PDF e hash adulterado', async () => {
    const pdf = await gerarPdf();
    expect(validarPdf(pdf.subarray(0, pdf.length - 200), boasHeaders(pdf)).join()).toMatch(/%%EOF|Content-Length|SHA-256/);
    expect(validarPdf(Buffer.alloc(0), {})).toEqual(['arquivo vazio']);
    expect(validarPdf(Buffer.from('<html>erro</html>'.repeat(100)), boasHeaders(pdf)).join()).toMatch(/não começa com %PDF/);
    expect(validarPdf(pdf, { ...boasHeaders(pdf), 'x-document-sha256': 'a'.repeat(64) }).join()).toMatch(/SHA-256/);
  });
  it('pega o defeito do nome com %20 e a falta de no-store', async () => {
    const pdf = await gerarPdf();
    const ruim = { ...boasHeaders(pdf), 'content-disposition': `attachment; filename="${encodeURIComponent('Ficha João.pdf')}"`, 'cache-control': 'public' };
    const erros = validarPdf(pdf, ruim).join(' | ');
    expect(erros).toMatch(/códigos %XX/);
    expect(erros).toMatch(/no-store/);
  });
  it('nomeDoArquivo prefere filename*=UTF-8 e decodifica acentos', () => {
    expect(nomeDoArquivo(contentDisposition('Relatório mensal.pdf'))).toBe('Relatório mensal.pdf');
  });
});

describe('validarCsv', () => {
  const headers = { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': contentDisposition('escalas-2026-10.csv') };
  it('CSV gerado pelo sistema passa', () => {
    expect(validarCsv(buildCsv(['Funcionário', 'Saldo'], [['José', '-1:30'], ['Ana', '2:00']]), headers, { cabecalhoEsperado: ['Funcionário'] })).toEqual([]);
  });
  it('pega BOM ausente, mojibake, apóstrofo em negativo, coluna a mais e tipo errado', () => {
    const erros = validarCsv('"FuncionÃ¡rio";"Saldo"\r\n"Zé";"\'-1:30";"extra"', { 'content-type': 'text/plain', 'content-disposition': 'attachment; filename="x.txt"' }).join(' | ');
    for (const trecho of ['sem BOM', 'mojibake', 'apóstrofo', 'colunas', 'text/csv', '.csv']) expect(erros).toContain(trecho);
  });
});
