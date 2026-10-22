import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

/**
 * Validação de upload pelo CONTEÚDO (OWASP ASVS V12): assinatura binária no offset 0, estrutura do ZIP/OOXML,
 * limites anti zip-bomb, nome sanitizado. Extensão e Content-Type informados pelo cliente nunca decidem nada.
 */
export type FileKind =
  | 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'png' | 'jpeg' | 'webp' | 'gif'
  | 'mp4' | 'webm' | 'mp3' | 'ogg' | 'wav' | 'text';
export type RejectedKind = 'executable' | 'script' | 'svg' | 'html' | 'archive' | 'ole' | 'macro-office' | 'unknown';

const META: Record<FileKind, { ext: string; mime: string }> = {
  pdf: { ext: 'pdf', mime: 'application/pdf' },
  docx: { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  xlsx: { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  pptx: { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  png: { ext: 'png', mime: 'image/png' },
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  webp: { ext: 'webp', mime: 'image/webp' },
  gif: { ext: 'gif', mime: 'image/gif' },
  mp4: { ext: 'mp4', mime: 'video/mp4' },
  webm: { ext: 'webm', mime: 'video/webm' },
  mp3: { ext: 'mp3', mime: 'audio/mpeg' },
  ogg: { ext: 'ogg', mime: 'audio/ogg' },
  wav: { ext: 'wav', mime: 'audio/wav' },
  text: { ext: 'txt', mime: 'text/plain' },
};

export const ALLOW = {
  RESUME: ['pdf', 'docx'],
  DOCUMENT: ['pdf', 'png', 'jpeg'],
  CERTIFICATE: ['pdf', 'png', 'jpeg', 'webp'],
  SUPPORT: ['png', 'jpeg', 'webp', 'pdf', 'text', 'mp4', 'webm'],
  SIGNED_PDF: ['pdf'],
  IMPORT: ['xlsx', 'text'],
  WHATSAPP: ['png', 'jpeg', 'webp', 'gif', 'pdf', 'docx', 'xlsx', 'pptx', 'text', 'mp4', 'webm', 'mp3', 'ogg', 'wav'],
} as const satisfies Record<string, readonly FileKind[]>;

export interface InspectOptions {
  allow: readonly FileKind[];
  maxBytes: number;
  filename?: string;
  /** Rejeita PDF com JavaScript/Launch/arquivo embutido. Padrão: true. */
  blockActivePdf?: boolean;
}

export type InspectResult =
  | { ok: true; kind: FileKind; extension: string; mime: string; safeName: string; sha256: string; size: number }
  | { ok: false; code: 'EMPTY' | 'TOO_LARGE' | 'NOT_ALLOWED' | 'UNSAFE'; message: string; detected: FileKind | RejectedKind };

const ZIP_MAX_ENTRIES = 1000;
const ZIP_MAX_TOTAL = 64 * 1024 * 1024;
const ZIP_MAX_RATIO = 100;

/** Nome seguro: sem caminho, NUL, controle, bidi/zero-width; pontos internos viram '-' (evita "a.php.pdf"); extensão vem do tipo real. */
export function sanitizeFileName(original: unknown, extension: string, fallback = 'arquivo'): string {
  let name = String(original ?? '').normalize('NFKC');
  name = name.split(/[\\/]/).pop() ?? '';
  name = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[​-‏‪-‮⁠-⁯﻿]/g, '')
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    .replace(/[^\p{L}\p{N} _-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-. ]+|[-. ]+$/g, '')
    .slice(0, 100);
  return `${name || fallback}.${extension}`;
}

function startsWith(buf: Buffer, bytes: number[], at = 0): boolean {
  return buf.length >= at + bytes.length && bytes.every((b, i) => buf[at + i] === b);
}

function ascii(buf: Buffer, from: number, to: number): string {
  return buf.subarray(from, to).toString('latin1');
}

interface ZipEntry { name: string; method: number; flags: number; comp: number; size: number; offset: number }

function readZip(buf: Buffer): { entries: ZipEntry[]; cdOffset: number } | 'bad' {
  const min = Math.max(0, buf.length - 65557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return 'bad';
  const total = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) return 'bad';
  if (total > ZIP_MAX_ENTRIES || cdOffset + cdSize > eocd) return 'bad';
  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < total; i += 1) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) return 'bad';
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const comp = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    if (comp === 0xffffffff || size === 0xffffffff || p + 46 + nameLen > buf.length) return 'bad';
    entries.push({ name: buf.subarray(p + 46, p + 46 + nameLen).toString('utf8'), method, flags, comp, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { entries, cdOffset };
}

/** Confere nomes, sobreposição de entradas (zip-bomb "overlapping") e descomprime com teto para provar o tamanho declarado. */
function zipProblem(buf: Buffer, zip: { entries: ZipEntry[]; cdOffset: number }): string | null {
  let total = 0;
  const sorted = [...zip.entries].sort((a, b) => a.offset - b.offset);
  for (let i = 0; i < sorted.length; i += 1) {
    const e = sorted[i];
    if (/(^|[\\/])\.\.([\\/]|$)|^[\\/]|\0|^[A-Za-z]:/.test(e.name)) return 'caminho invalido dentro do arquivo compactado';
    if (e.flags & 1) return 'arquivo compactado com senha';
    if (e.method !== 0 && e.method !== 8) return 'metodo de compactacao nao suportado';
    if (e.offset + 30 > buf.length || buf.readUInt32LE(e.offset) !== 0x04034b50) return 'estrutura corrompida';
    const dataStart = e.offset + 30 + buf.readUInt16LE(e.offset + 26) + buf.readUInt16LE(e.offset + 28);
    const dataEnd = dataStart + e.comp;
    const limit = i + 1 < sorted.length ? sorted[i + 1].offset : zip.cdOffset;
    if (dataEnd > limit || dataEnd > buf.length) return 'entradas sobrepostas ou truncadas';
    total += e.size;
    if (total > ZIP_MAX_TOTAL) return 'conteudo descompactado grande demais';
    if (e.comp > 0 ? e.size / e.comp > ZIP_MAX_RATIO : e.size > 1024) return 'razao de compressao suspeita';
    if (e.method === 8) {
      try {
        const out = inflateRawSync(buf.subarray(dataStart, dataEnd), { maxOutputLength: e.size + 1 });
        if (out.length !== e.size) return 'tamanho declarado diferente do real';
      } catch {
        return 'conteudo compactado invalido ou maior que o declarado';
      }
    } else if (e.comp !== e.size) {
      return 'tamanho declarado diferente do real';
    }
  }
  return null;
}

function classify(buf: Buffer, blockActivePdf: boolean): { kind: FileKind } | { rejected: RejectedKind } | { unsafe: string; kind: FileKind } {
  if (startsWith(buf, [0x4d, 0x5a]) || startsWith(buf, [0x7f, 0x45, 0x4c, 0x46]) || startsWith(buf, [0xfe, 0xed, 0xfa]) || startsWith(buf, [0xce, 0xfa, 0xed, 0xfe]) || startsWith(buf, [0xcf, 0xfa, 0xed, 0xfe]) || startsWith(buf, [0xca, 0xfe, 0xba, 0xbe])) return { rejected: 'executable' };
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0])) return { rejected: 'ole' };
  if (startsWith(buf, [0x52, 0x61, 0x72, 0x21]) || startsWith(buf, [0x37, 0x7a, 0xbc, 0xaf]) || startsWith(buf, [0x1f, 0x8b])) return { rejected: 'archive' };

  if (ascii(buf, 0, 5) === '%PDF-') {
    if (blockActivePdf) {
      const text = buf.toString('latin1').replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      if (/\/(JavaScript|Launch|EmbeddedFile|RichMedia)(?![A-Za-z0-9])|\/JS(?![A-Za-z0-9])/.test(text)) return { unsafe: 'PDF com script, executavel ou arquivo embutido', kind: 'pdf' };
    }
    return { kind: 'pdf' };
  }
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) && buf.length > 24 && ascii(buf, 12, 16) === 'IHDR') return polyglot(buf, 'png');
  if (startsWith(buf, [0xff, 0xd8, 0xff]) && buf.length > 4 && buf[3] >= 0xc0) return polyglot(buf, 'jpeg');
  if (ascii(buf, 0, 4) === 'RIFF' && buf.length > 16) {
    const form = ascii(buf, 8, 12);
    if (form === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(ascii(buf, 12, 16))) return polyglot(buf, 'webp');
    if (form === 'WAVE') return { kind: 'wav' };
  }
  if (['GIF87a', 'GIF89a'].includes(ascii(buf, 0, 6))) return polyglot(buf, 'gif');
  if (buf.length > 12 && ascii(buf, 4, 8) === 'ftyp') return { kind: 'mp4' };
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return { kind: 'webm' };
  if (ascii(buf, 0, 4) === 'OggS') return { kind: 'ogg' };
  if (ascii(buf, 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 && buf.length > 4)) return { kind: 'mp3' };

  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    const zip = readZip(buf);
    if (zip === 'bad') return { rejected: 'archive' };
    const names = new Set(zip.entries.map((e) => e.name));
    const kind: FileKind | null = !names.has('[Content_Types].xml') ? null
      : names.has('word/document.xml') ? 'docx'
      : names.has('xl/workbook.xml') ? 'xlsx'
      : names.has('ppt/presentation.xml') ? 'pptx' : null;
    if (!kind) return { rejected: 'archive' };
    const problem = zipProblem(buf, zip);
    if (problem) return { unsafe: `Arquivo ${META[kind].ext.toUpperCase()} suspeito: ${problem}`, kind };
    const macro = [...names].some((n) => /(^|\/)vbaProject\.bin$|^.*activeX\//i.test(n));
    const ctypes = buf.toString('latin1').includes('macroEnabled');
    if (macro || ctypes) return { rejected: 'macro-office' };
    return { kind };
  }

  const head = buf.subarray(0, 4096).toString('latin1').toLowerCase();
  const probe = head.replace(/^﻿|^\s+/, '');
  if (/<svg[\s>]/.test(probe) || (probe.startsWith('<?xml') && probe.includes('<svg'))) return { rejected: 'svg' };
  if (/^<(!doctype html|html|head|body|script|iframe)/.test(probe) || /<script[\s>]/.test(probe)) return { rejected: probe.includes('<script') ? 'script' : 'html' };
  if (probe.startsWith('#!') && !probe.startsWith('#!amr')) return { rejected: 'script' };
  if (buf.length && !buf.includes(0)) {
    let ctrl = 0;
    const sample = buf.subarray(0, Math.min(buf.length, 8192));
    for (const b of sample) if (b < 9 || (b > 13 && b < 32)) ctrl += 1;
    if (ctrl / sample.length < 0.02) return { kind: 'text' };
  }
  return { rejected: 'unknown' };
}

/** Imagem com HTML/PHP anexado ao final (polyglot) não passa. */
function polyglot(buf: Buffer, kind: FileKind): { kind: FileKind } | { unsafe: string; kind: FileKind } {
  return /<\s*script|<\?php|<html/i.test(buf.toString('latin1'))
    ? { unsafe: 'imagem com codigo embutido (polyglot)', kind }
    : { kind };
}

export function inspectFile(buffer: Buffer | undefined | null, options: InspectOptions): InspectResult {
  if (!buffer?.length) return { ok: false, code: 'EMPTY', message: 'O arquivo esta vazio.', detected: 'unknown' };
  if (buffer.length > options.maxBytes) {
    return { ok: false, code: 'TOO_LARGE', message: `O arquivo deve ter no maximo ${Math.round(options.maxBytes / 1048576)} MB.`, detected: 'unknown' };
  }
  const found = classify(buffer, options.blockActivePdf !== false);
  if ('rejected' in found) {
    return { ok: false, code: 'NOT_ALLOWED', message: 'Tipo de arquivo nao permitido.', detected: found.rejected };
  }
  if ('unsafe' in found) {
    return { ok: false, code: 'UNSAFE', message: `Arquivo recusado: ${found.unsafe}.`, detected: found.kind };
  }
  if (!options.allow.includes(found.kind)) {
    return { ok: false, code: 'NOT_ALLOWED', message: 'Tipo de arquivo nao permitido neste envio.', detected: found.kind };
  }
  const { ext, mime } = META[found.kind];
  const declared = String(options.filename ?? '').toLowerCase().match(/\.([a-z0-9]{1,5})$/)?.[1];
  const extension = found.kind === 'text' && declared === 'csv' ? 'csv' : ext;
  return {
    ok: true,
    kind: found.kind,
    extension,
    mime: extension === 'csv' ? 'text/csv' : mime,
    safeName: sanitizeFileName(options.filename, extension),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    size: buffer.length,
  };
}

/** Versão que lança 413 (tamanho) ou 400 (conteúdo). */
export function assertValidUpload(buffer: Buffer | undefined | null, options: InspectOptions) {
  const result = inspectFile(buffer, options);
  if (result.ok) return result;
  const body = { message: result.message, code: `FILE_${result.code}` };
  if (result.code === 'TOO_LARGE') throw new PayloadTooLargeException(body);
  throw new BadRequestException(body);
}
