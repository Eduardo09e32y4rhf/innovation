import { InternalServerErrorException } from '@nestjs/common';
import { PassThrough } from 'stream';

/** Nome de arquivo seguro para o cabeçalho (ASCII) + variante UTF-8 (RFC 5987) para acentos. */
export function contentDisposition(filename: string, type: 'attachment' | 'inline' = 'attachment') {
  const clean = filename.replace(/[\r\n"\\]/g, '').trim() || 'documento.pdf';
  const ascii = clean.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '_').replace(/%/g, '_');
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

export function safeFileName(value: string | null | undefined, fallback = 'documento') {
  const base = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || fallback;
}

/** Coleta o PDF em memória: só enviamos cabeçalhos/200 depois que o documento foi gerado com sucesso. */
export function createPdfSink() {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
  return { stream, done };
}

export const EXPOSED_HEADERS = 'Content-Disposition, Content-Length, Digest, ETag, X-Document-Id, X-Document-Sha256, X-Document-Type, X-Document-Version, X-Document-Generated-At, X-Document-Records, X-Calculation-Versions';

/** Envia um PDF já pronto (Fastify ou Express) com cabeçalhos corretos e legíveis pelo navegador. */
export function sendPdf(res: any, buffer: Buffer, filename: string, extraHeaders: Record<string, string> = {}) {
  if (!buffer?.length || buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
    throw new InternalServerErrorException('Falha ao gerar o PDF.');
  }
  const target = res.raw ?? res;
  const headers: Record<string, string> = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': contentDisposition(filename),
    'Content-Length': String(buffer.length),
    'Cache-Control': 'private, no-store',
    'Access-Control-Expose-Headers': EXPOSED_HEADERS,
    ...extraHeaders,
  };
  for (const [name, value] of Object.entries(headers)) {
    if (typeof target.setHeader === 'function') target.setHeader(name, value);
    else if (typeof res.header === 'function') res.header(name, value);
  }
  target.statusCode = 200;
  target.end(buffer);
}
