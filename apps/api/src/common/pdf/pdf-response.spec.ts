import { describe, expect, it } from 'vitest';
import { contentDisposition, createPdfSink, safeFileName, sendPdf } from './pdf-response';

async function realPdf(text: string) {
  const sink = createPdfSink();
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(sink.stream);
  doc.font('Helvetica-Bold').fontSize(14).text(text);
  doc.end();
  return sink.done;
}

function fakeResponse() {
  const headers: Record<string, string> = {};
  let body: Buffer | undefined;
  const raw = { setHeader: (name: string, value: string) => { headers[name.toLowerCase()] = value; }, end: (data: Buffer) => { body = data; }, statusCode: 0 };
  return { res: { raw }, headers, get body() { return body; }, raw };
}

describe('PDFs: geração e envio', () => {
  it('gera um PDF real com acentos e o envia com cabeçalhos corretos', async () => {
    const buffer = await realPdf('Relatório contábil — Fechamento João & Cia');
    const out = fakeResponse();
    sendPdf(out.res, buffer, 'Relatório João — março.pdf');

    expect(out.body?.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(out.headers['content-type']).toBe('application/pdf');
    expect(out.headers['content-length']).toBe(String(buffer.length));
    expect(out.headers['content-disposition']).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
    expect(out.headers['access-control-expose-headers']).toContain('Content-Disposition');
    expect(out.raw.statusCode).toBe(200);
  });

  it('recusa enviar conteúdo que não é PDF (evita 200 com corpo truncado)', () => {
    const out = fakeResponse();
    expect(() => sendPdf(out.res, Buffer.from('<html>erro</html>'), 'x.pdf')).toThrow(/Falha ao gerar o PDF/);
    expect(out.body).toBeUndefined();
  });

  it('nome de arquivo nunca quebra o cabeçalho', () => {
    expect(contentDisposition('Folha "Ponto"\r\nX-Evil: 1.pdf')).not.toMatch(/[\r\n]/);
    expect(contentDisposition('Ação — nº 1.pdf')).toContain("filename*=UTF-8''A%C3%A7%C3%A3o");
    expect(safeFileName('Açaí & Cia Ltda.')).toBe('Acai-Cia-Ltda');
    expect(safeFileName('', 'doc')).toBe('doc');
  });
});
