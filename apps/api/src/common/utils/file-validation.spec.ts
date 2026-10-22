import fastifyMultipart from '@fastify/multipart';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeZip } from '../../../tests/unit/zip-fixture';
import { ALLOW, assertValidUpload, inspectFile, sanitizeFileName } from './file-validation';

const MB = 1024 * 1024;

const text = (s: string) => Buffer.from(s);
const docx = (extra: ZEntry[] = []) => makeZip([
  { name: '[Content_Types].xml', data: text('<Types/>') },
  { name: 'word/document.xml', data: text('<w:document>Ola mundo</w:document>') },
  ...extra,
]);
const pdf = (extra = '') => Buffer.concat([text('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n' + extra + '%%EOF\n'), Buffer.alloc(200, 0x20)]);
const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), text('IHDR'), Buffer.alloc(40, 1)]);
const jpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 2)]);
const webp = () => Buffer.concat([text('RIFF'), Buffer.from([0x30, 0, 0, 0]), text('WEBPVP8 '), Buffer.alloc(60, 3)]);

const resume = (b: Buffer | null | undefined, filename = 'cv.pdf') => inspectFile(b, { allow: ALLOW.RESUME, maxBytes: 5 * MB, filename });

describe('file-validation: aceita arquivos legítimos pelo conteúdo', () => {
  it('PDF, DOCX, PNG, JPEG e WEBP verdadeiros', () => {
    expect(resume(pdf())).toMatchObject({ ok: true, kind: 'pdf', extension: 'pdf', mime: 'application/pdf' });
    expect(resume(docx(), 'cv.docx')).toMatchObject({ ok: true, kind: 'docx', extension: 'docx' });
    for (const [buf, kind] of [[png(), 'png'], [jpeg(), 'jpeg'], [webp(), 'webp']] as const) {
      expect(inspectFile(buf, { allow: ALLOW.CERTIFICATE, maxBytes: MB, filename: 'a' })).toMatchObject({ ok: true, kind });
    }
  });

  it('importação aceita XLSX e CSV (texto), e CSV ganha extensão csv', () => {
    const xlsx = makeZip([{ name: '[Content_Types].xml', data: text('<Types/>') }, { name: 'xl/workbook.xml', data: text('<workbook/>') }]);
    expect(inspectFile(xlsx, { allow: ALLOW.IMPORT, maxBytes: 2 * MB, filename: 'f.xlsx' })).toMatchObject({ ok: true, kind: 'xlsx' });
    expect(inspectFile(text('nome,cpf\nAna,123\n'), { allow: ALLOW.IMPORT, maxBytes: 2 * MB, filename: 'f.csv' })).toMatchObject({ ok: true, kind: 'text', extension: 'csv', mime: 'text/csv' });
  });
});

describe('file-validation: vetores maliciosos rejeitados (100%)', () => {
  const vectors: Array<[string, Buffer, string]> = [
    ['.exe renomeado para .pdf (MZ)', Buffer.concat([text('MZ'), Buffer.alloc(300)]), 'executable'],
    ['ELF renomeado', Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(300)]), 'executable'],
    ['polyglot MZ + %PDF dentro dos primeiros bytes', Buffer.concat([text('MZ'), Buffer.alloc(100), pdf()]), 'executable'],
    ['%PDF- fora do offset 0', Buffer.concat([text('GIF-lixo\n'), pdf()]), 'text'],
    ['SVG com onload', text('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'), 'svg'],
    ['SVG com prólogo xml', text('<?xml version="1.0"?><svg onload=alert(1)/>'), 'svg'],
    ['HTML com script', text('<!DOCTYPE html><script>alert(1)</script>'), 'script'],
    ['script solto', text('<script>fetch("//evil")</script>'), 'script'],
    ['shell script', text('#!/bin/sh\nrm -rf /\n'), 'script'],
    ['binário desconhecido', Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 0]), 'unknown'],
    ['DOC legado (OLE2, macros)', Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), Buffer.alloc(200)]), 'ole'],
    ['RAR', Buffer.concat([text('Rar!'), Buffer.alloc(100)]), 'archive'],
    ['ZIP genérico (não OOXML)', makeZip([{ name: 'a.txt', data: text('oi') }]), 'archive'],
    ['DOCM com macro (vbaProject.bin)', docx([{ name: 'word/vbaProject.bin', data: text('macro') }]), 'macro-office'],
  ];
  it.each(vectors)('%s', (_name, buffer, detected) => {
    const r = resume(buffer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detected).toBe(detected);
  });

  it('arquivo de 0 byte e arquivo de 11 MB', () => {
    expect(resume(Buffer.alloc(0))).toMatchObject({ ok: false, code: 'EMPTY' });
    expect(resume(null)).toMatchObject({ ok: false, code: 'EMPTY' });
    expect(inspectFile(Buffer.concat([pdf(), Buffer.alloc(11 * MB)]), { allow: ALLOW.RESUME, maxBytes: 10 * MB })).toMatchObject({ ok: false, code: 'TOO_LARGE' });
  });

  it('PDF com JavaScript, /Launch ou nome ofuscado em hex', () => {
    for (const evil of ['/JavaScript', '/JS (app.alert(1))', '/Launch', '/EmbeddedFile', '/J#61vaScript']) {
      expect(resume(pdf(`<< /S ${evil} >>\n`))).toMatchObject({ ok: false, code: 'UNSAFE' });
    }
    expect(resume(pdf('<< /OpenAction [3 0 R /Fit] >>\n'))).toMatchObject({ ok: true });
  });

  it('imagem com script/PHP anexado (polyglot)', () => {
    for (const tail of ['<script>alert(1)</script>', '<?php system($_GET[0]); ?>']) {
      const r = inspectFile(Buffer.concat([png(), text(tail)]), { allow: ALLOW.CERTIFICATE, maxBytes: MB });
      expect(r).toMatchObject({ ok: false, code: 'UNSAFE' });
    }
  });

  it('tipo real fora da lista do endpoint (PNG como currículo)', () => {
    expect(resume(png())).toMatchObject({ ok: false, code: 'NOT_ALLOWED', detected: 'png' });
  });

  it('zip bomb: razão de compressão absurda (70 MB de zeros em ~70 KB)', () => {
    const bomb = docx([{ name: 'word/bomb.bin', data: Buffer.alloc(70 * MB) }]);
    expect(bomb.length).toBeLessThan(200_000);
    expect(resume(bomb, 'cv.docx')).toMatchObject({ ok: false, code: 'UNSAFE' });
  });

  it('zip bomb de entradas sobrepostas e tamanho declarado mentiroso', () => {
    const overlap = makeZip([
      { name: '[Content_Types].xml', data: text('<Types/>') },
      { name: 'word/document.xml', data: text('<w:document/>') },
      { name: 'word/b.bin', data: text('x'), sameOffsetAs: 1 },
    ]);
    expect(resume(overlap, 'cv.docx')).toMatchObject({ ok: false, code: 'UNSAFE' });
    const liar = docx([{ name: 'word/liar.bin', data: Buffer.alloc(5000, 7), declaredSize: 10 }]);
    expect(resume(liar, 'cv.docx')).toMatchObject({ ok: false, code: 'UNSAFE' });
  });

  it('caminho com .. dentro do zip', () => {
    expect(resume(docx([{ name: '../../evil.sh', data: text('x') }]), 'cv.docx')).toMatchObject({ ok: false, code: 'UNSAFE' });
  });

  it('assertValidUpload lança 413 para tamanho e 400 para conteúdo', () => {
    expect(() => assertValidUpload(Buffer.alloc(2 * MB, 1), { allow: ALLOW.RESUME, maxBytes: MB })).toThrow(/maximo 1 MB/);
    try { assertValidUpload(text('MZ....'), { allow: ALLOW.RESUME, maxBytes: MB }); } catch (e: any) { expect(e.getStatus()).toBe(400); }
    try { assertValidUpload(Buffer.alloc(2 * MB, 1), { allow: ALLOW.RESUME, maxBytes: MB }); } catch (e: any) { expect(e.getStatus()).toBe(413); }
  });
});

describe('sanitizeFileName', () => {
  it('remove caminho, NUL, bidi e neutraliza dupla extensão', () => {
    expect(sanitizeFileName('../../x.pdf', 'pdf')).toBe('x.pdf');
    expect(sanitizeFileName('C:\\Users\\a\\cv.pdf', 'pdf')).toBe('cv.pdf');
    expect(sanitizeFileName('cv\0.php.pdf', 'pdf')).toBe('cv-php.pdf');
    expect(sanitizeFileName('evil\u202Egnp.exe', 'pdf')).toBe('evilgnp.pdf');
    expect(sanitizeFileName('', 'pdf', 'curriculo')).toBe('curriculo.pdf');
    expect(sanitizeFileName('Currículo João.pdf', 'pdf')).toBe('Currículo João.pdf');
    expect(sanitizeFileName('a'.repeat(500) + '.pdf', 'pdf').length).toBeLessThanOrEqual(104);
  });
});

describe('black-box: multipart real (Fastify) com os mesmos vetores', () => {
  const adapter = new FastifyAdapter();
  const app = adapter.getInstance();
  beforeAll(async () => {
    await app.register(fastifyMultipart, { limits: { fileSize: 10 * MB } });
    app.post('/upload', async (req, reply) => {
      const file = await (req as any).file();
      const buffer = await file.toBuffer();
      const r = inspectFile(buffer, { allow: ALLOW.RESUME, maxBytes: 5 * MB, filename: file.filename });
      return reply.status(r.ok ? 200 : r.code === 'TOO_LARGE' ? 413 : 400).send(r.ok ? { name: r.safeName } : { code: r.code, detected: r.detected });
    });
    await app.ready();
  });
  afterAll(() => app.close());

  const upload = async (filename: string, content: Buffer) => {
    const boundary = '----t';
    const body = Buffer.concat([
      text(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`),
      content,
      text(`\r\n--${boundary}--\r\n`),
    ]);
    return app.inject({ method: 'POST', url: '/upload', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: body });
  };

  it('PDF legítimo passa e o nome é saneado', async () => {
    const res = await upload('../../Meu CV.pdf', pdf());
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Meu CV.pdf');
  });
  it.each([
    ['evil.pdf', Buffer.concat([text('MZ'), Buffer.alloc(300)]), 400],
    ['x.pdf', Buffer.alloc(0), 400],
    ['cv.pdf', docx([{ name: 'word/b.bin', data: Buffer.alloc(70 * MB) }]), 400],
    ['grande.pdf', Buffer.concat([pdf(), Buffer.alloc(6 * MB)]), 413],
    ['img.pdf', text('<svg onload=alert(1)></svg>'), 400],
  ] as const)('%s é rejeitado com status correto', async (name, content, status) => {
    const res = await upload(name, content as Buffer);
    expect(res.statusCode).toBe(status);
  });
});
