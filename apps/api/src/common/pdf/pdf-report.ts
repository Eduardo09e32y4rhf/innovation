import PDFDocument from 'pdfkit';
import { INVOICE_LOGO_PNG_BASE64 } from '../../modules/finance/invoice-logo';
import { createPdfSink } from './pdf-response';

/**
 * Base única de todos os PDFs do sistema: mesmo cabeçalho, mesmas tabelas, mesmo rodapé.
 * Documentos da plataforma (fatura, extrato, nota fiscal) levam a logo da Innovation; todos os outros levam a logo da empresa contratante
 * (ou as iniciais do nome dela quando não há logo).
 */

export const PDF = {
  L: 40, R: 555, W: 515, TOP: 40, BODY_TOP: 78, BOTTOM: 772,
  color: {
    ink: '#0f172a', mut: '#64748b', line: '#e2e8f0', soft: '#f8fafc', band: '#f1f5f9', brand: '#6d28d9', brandSoft: '#f5f3ff', gray: '#475569',
    ok: '#047857', okBg: '#ecfdf5', warn: '#b45309', warnBg: '#fffbeb', bad: '#be123c', badBg: '#fff1f2',
  },
};
const C = PDF.color;
const TZ = 'America/Sao_Paulo';

export type PdfTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';
const TONES: Record<PdfTone, { fg: string; bg: string }> = {
  ok: { fg: C.ok, bg: C.okBg }, warn: { fg: C.warn, bg: C.warnBg }, bad: { fg: C.bad, bg: C.badBg }, info: { fg: C.brand, bg: C.brandSoft }, neutral: { fg: C.gray, bg: C.band },
};

export interface PdfBrand {
  /** true: logo da Innovation (documentos da plataforma). false/omitido: logo da empresa contratante. */
  platform?: boolean;
  name: string;
  document?: string | null;
  logoUrl?: string | null;
  tagline?: string;
}

export interface PdfReportOptions {
  title: string;
  brand: PdfBrand;
  number?: string;
  subtitle?: string;
  chip?: { label: string; tone: PdfTone };
  /** Texto do rodapé, à esquerda (aviso legal curto). */
  footerNote?: string;
  /** Identificador exibido no rodapé. */
  footerId?: string;
  generatedAt?: Date;
  author?: string;
}

export type PdfCell = string | { text: string; color?: string; bold?: boolean; align?: 'left' | 'right' | 'center' };
export interface PdfColumn { label: string; width: number; align?: 'left' | 'right' | 'center' }

export const fmt = {
  money: (value: unknown) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  /** Data sem hora (competência, vencimento, nascimento): UTC. */
  day: (value?: Date | string | null) => (value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value)) : '-'),
  /** Momento real (batida, emissão): horário de Brasília. */
  dayBr: (value?: Date | string | null) => (value ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ }).format(new Date(value)) : '-'),
  time: (value?: Date | string | null) => (value ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)) : '--:--'),
  dateTime: (value?: Date | string | null) => (value ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-'),
  document: (value?: string | null) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return value ? String(value) : '';
  },
  minutes: (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined) return '--';
    const abs = Math.abs(minutes);
    return `${minutes < 0 ? '-' : ''}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
  },
};

/** Iniciais do nome da empresa: primeira letra da primeira e da última palavra (mesma regra do menu). */
export function companyInitials(name?: string | null) {
  const words = String(name ?? '').trim().split(/\s+/).filter((word) => word && !/^(d[aeo]s?|e)$/i.test(word));
  if (!words.length) return '··';
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toLocaleUpperCase('pt-BR');
}

const isPng = (b: Buffer) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8;
const MAX_LOGO_BYTES = 1_500_000;

/**
 * Lê a logo da empresa (data URL ou https) e devolve só PNG/JPEG, os formatos que o PDF aceita. Qualquer problema (WebP, URL fora do ar,
 * arquivo grande) devolve null e o documento sai com as iniciais. Servidor interno nunca é consultado.
 */
export async function loadLogo(logoUrl?: string | null): Promise<Buffer | null> {
  const url = String(logoUrl ?? '').trim();
  if (!url) return null;
  try {
    let buffer: Buffer | null = null;
    const data = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/i.exec(url);
    if (data) buffer = Buffer.from(data[2], 'base64');
    else if (/^https:\/\//i.test(url)) {
      const host = new URL(url).hostname.toLowerCase();
      if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || /^[\d.]+$/.test(host) || host.includes(':')) return null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(url, { signal: controller.signal, redirect: 'error' });
        if (!res.ok) return null;
        const bytes = Buffer.from(await res.arrayBuffer());
        buffer = bytes;
      } finally { clearTimeout(timer); }
    }
    if (!buffer || buffer.length > MAX_LOGO_BYTES) return null;
    return isPng(buffer) || isJpeg(buffer) ? buffer : null;
  } catch { return null; }
}

export class PdfReport {
  readonly doc: PDFKit.PDFDocument;
  y = PDF.BODY_TOP;
  private readonly sink = createPdfSink();
  /** A logo vai como texto (data URI): assim o pdfkit guarda a imagem uma vez só, mesmo desenhada em todas as páginas. */
  private readonly logoSrc: string | null;
  private constructor(private readonly options: PdfReportOptions, private readonly logo: Buffer | null) {
    this.logoSrc = logo ? `data:image/${isPng(logo) ? 'png' : 'jpeg'};base64,${logo.toString('base64')}` : null;
    this.doc = new PDFDocument({
      size: 'A4', margins: { top: PDF.TOP, bottom: 30, left: PDF.L, right: 40 }, bufferPages: true,
      info: { Title: `${options.title}${options.number ? ` ${options.number}` : ''}`, Author: options.author ?? options.brand.name, Subject: options.title },
    });
    this.doc.pipe(this.sink.stream);
  }

  static async create(options: PdfReportOptions) {
    const logo = options.brand.platform ? Buffer.from(INVOICE_LOGO_PNG_BASE64, 'base64') : await loadLogo(options.brand.logoUrl);
    const report = new PdfReport(options, logo);
    report.drawHeader();
    return report;
  }

  // ───────────── estrutura da página ─────────────

  private drawLogo(x: number, y: number, size: number) {
    const { doc } = this;
    if (this.logo) {
      // Contida num quadrado de borda fina: nem estoura, nem some em logo clara.
      doc.roundedRect(x, y, size, size, 8).lineWidth(0.8).fillAndStroke('#ffffff', C.line);
      try { doc.image(this.logoSrc!, x + 4, y + 4, { fit: [size - 8, size - 8], align: 'center', valign: 'center' }); return; } catch { /* imagem ilegível: cai nas iniciais */ }
    }
    doc.roundedRect(x, y, size, size, 8).fill(C.brand);
    doc.font('Helvetica-Bold').fontSize(size * 0.36).fillColor('#ffffff').text(companyInitials(this.options.brand.name), x, y + size * 0.33, { width: size, align: 'center', lineBreak: false });
  }

  private drawHeader() {
    const { doc, options } = this;
    const { brand } = options;
    this.drawLogo(PDF.L, 34, 54);
    const textX = PDF.L + 66;
    // Esquerda: nome da empresa (até 2 linhas) e CNPJ. Direita: título do documento, número e período.
    const leftW = 195;
    const nameSize = brand.platform ? 17 : 13;
    doc.font('Helvetica-Bold').fontSize(nameSize);
    const nameH = Math.min(doc.heightOfString(brand.name, { width: leftW }), nameSize * 2.4);
    doc.fillColor(C.ink).text(brand.name, textX, 36, { width: leftW, height: nameH, ellipsis: true });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.mut);
    const sub = brand.platform ? (brand.tagline ?? 'Tecnologia · Gestão · Resultados') : (brand.document ? `CNPJ ${fmt.document(brand.document)}` : '');
    if (sub) doc.text(sub, textX, 36 + nameH + 3, { width: leftW, lineBreak: false, ellipsis: true });

    const titleText = options.title.toUpperCase();
    doc.font('Helvetica-Bold');
    let titleSize = 22;
    while (titleSize > 11 && doc.fontSize(titleSize).widthOfString(titleText) > 250) titleSize -= 1;
    doc.fontSize(titleSize).fillColor(C.brand).text(titleText, PDF.R - 250, 36, { width: 250, align: 'right', lineBreak: false });
    if (options.number) doc.font('Helvetica').fontSize(9.5).fillColor(C.mut).text(options.number, PDF.R - 250, 66, { width: 250, align: 'right', lineBreak: false, ellipsis: true });
    if (options.subtitle) doc.font('Helvetica').fontSize(9).fillColor(C.mut).text(options.subtitle, PDF.R - 250, options.number ? 80 : 68, { width: 250, align: 'right', lineBreak: false, ellipsis: true });
    if (options.chip) {
      const tone = TONES[options.chip.tone];
      doc.font('Helvetica-Bold').fontSize(8.5);
      const chipW = doc.widthOfString(options.chip.label) + 22;
      doc.roundedRect(PDF.L + 66, 86, chipW, 16, 8).fill(tone.bg);
      doc.fillColor(tone.fg).text(options.chip.label, PDF.L + 66, 90.5, { width: chipW, align: 'center', lineBreak: false });
    }
    doc.moveTo(PDF.L, 108).lineTo(PDF.R, 108).lineWidth(2).strokeColor(C.brand).stroke();
    this.y = 124;
  }

  private drawRunningHeader() {
    const { doc, options } = this;
    this.drawLogoSmall();
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.ink).text(options.brand.name, PDF.L + 30, 22, { width: 300, lineBreak: false, ellipsis: true });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.mut).text(`${options.title}${options.number ? ` · ${options.number}` : ''}`, PDF.R - 250, 24, { width: 250, align: 'right', lineBreak: false });
    doc.moveTo(PDF.L, 42).lineTo(PDF.R, 42).lineWidth(0.8).strokeColor(C.line).stroke();
  }

  private drawLogoSmall() { this.drawLogo(PDF.L, 16, 22); }

  /** Garante espaço: se não couber, abre página nova (com cabeçalho compacto). */
  ensure(height: number) {
    if (this.y + height <= PDF.BOTTOM) return false;
    this.newPage();
    return true;
  }

  newPage() {
    this.doc.addPage();
    this.y = 62;
  }

  // ───────────── blocos ─────────────

  /** Título de seção com filete de cor. */
  section(title: string, hint?: string) {
    this.ensure(34);
    const { doc } = this;
    doc.roundedRect(PDF.L, this.y + 1, 3, 12, 1.5).fill(C.brand);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text(title.toUpperCase(), PDF.L + 10, this.y + 2, { lineBreak: false, characterSpacing: 0.6 });
    if (hint) doc.font('Helvetica').fontSize(8.5).fillColor(C.mut).text(hint, PDF.L + 10, this.y + 2, { width: PDF.W - 10, align: 'right', lineBreak: false });
    this.y += 24;
  }

  paragraph(text: string, options: { size?: number; color?: string; bold?: boolean; gap?: number } = {}) {
    const { doc } = this;
    doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.size ?? 9.5);
    const h = doc.heightOfString(text, { width: PDF.W, lineGap: 2 });
    this.ensure(h);
    doc.fillColor(options.color ?? C.gray).text(text, PDF.L, this.y, { width: PDF.W, lineGap: 2 });
    this.y += h + (options.gap ?? 10);
  }

  /** Dois quadros lado a lado (emitente/cliente, empregador/colaborador). */
  parties(left: { title: string; name: string; lines: string[] }, right: { title: string; name: string; lines: string[] }) {
    const { doc } = this;
    const gap = 14;
    const w = (PDF.W - gap) / 2;
    const height = (p: { name: string; lines: string[] }) => {
      doc.font('Helvetica-Bold').fontSize(10.5);
      let h = 24 + doc.heightOfString(p.name, { width: w - 24 }) + 10;
      doc.font('Helvetica').fontSize(8.8);
      p.lines.filter(Boolean).forEach((line) => { h += doc.heightOfString(line, { width: w - 24 }) + 1.5; });
      return Math.max(h, 66);
    };
    const h = Math.max(height(left), height(right));
    this.ensure(h);
    [[left, PDF.L], [right, PDF.L + w + gap]].forEach(([p, x]) => {
      const party = p as typeof left;
      doc.roundedRect(x as number, this.y, w, h, 8).lineWidth(0.8).fillAndStroke(C.soft, C.line);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.brand).text(party.title, (x as number) + 12, this.y + 10, { lineBreak: false, characterSpacing: 0.8 });
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.ink).text(party.name, (x as number) + 12, this.y + 24, { width: w - 24 });
      doc.font('Helvetica').fontSize(8.8).fillColor(C.gray);
      party.lines.filter(Boolean).forEach((line) => doc.text(line, (x as number) + 12, doc.y + 1.5, { width: w - 24 }));
    });
    this.y += h + 16;
  }

  /** Grade de pares rótulo/valor (datas, referências, dados do colaborador). */
  fields(items: Array<[string, string]>, columns = 4) {
    const { doc } = this;
    const cellW = PDF.W / columns;
    for (let i = 0; i < items.length; i += columns) {
      const row = items.slice(i, i + columns);
      doc.font('Helvetica-Bold').fontSize(10.5);
      const h = 14 + Math.max(...row.map(([, v]) => doc.heightOfString(v || '-', { width: cellW - 10 }))) + 10;
      this.ensure(h);
      row.forEach(([label, value], index) => {
        const x = PDF.L + index * cellW;
        doc.font('Helvetica-Bold').fontSize(7.2).fillColor(C.mut).text(label.toUpperCase(), x, this.y, { width: cellW - 10, lineBreak: false, characterSpacing: 0.6 });
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.ink).text(value || '-', x, this.y + 12, { width: cellW - 10 });
      });
      this.y += h;
    }
    this.y += 4;
  }

  /** Faixa de indicadores (totais do período). */
  stats(items: Array<[string, string]>) {
    const { doc } = this;
    const n = items.length;
    const gap = 8;
    const w = (PDF.W - gap * (n - 1)) / n;
    this.ensure(52);
    items.forEach(([label, value], index) => {
      const x = PDF.L + index * (w + gap);
      doc.roundedRect(x, this.y, w, 44, 7).lineWidth(0.8).fillAndStroke(C.soft, C.line);
      doc.font('Helvetica').fontSize(7.5).fillColor(C.mut).text(label, x + 10, this.y + 8, { width: w - 20, lineBreak: false, ellipsis: true });
      doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ink).text(value, x + 10, this.y + 22, { width: w - 20, lineBreak: false, ellipsis: true });
    });
    this.y += 56;
  }

  /** Tabela com cabeçalho repetido a cada página, linhas zebradas e quebra de texto. */
  table(columns: PdfColumn[], rows: PdfCell[][], options: { fontSize?: number; emptyText?: string; totals?: PdfCell[] } = {}) {
    const { doc } = this;
    const size = options.fontSize ?? 8.5;
    const pad = 6;
    const header = () => {
      this.ensure(24);
      doc.roundedRect(PDF.L, this.y, PDF.W, 20, 5).fill(C.band);
      let x = PDF.L;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(C.gray);
      columns.forEach((col) => { doc.text(col.label.toUpperCase(), x + pad, this.y + 7, { width: col.width - pad * 2, align: col.align ?? 'left', lineBreak: false, characterSpacing: 0.3 }); x += col.width; });
      this.y += 24;
    };
    const cellOf = (cell: PdfCell) => (typeof cell === 'string' ? { text: cell } : cell);
    const drawRow = (cells: PdfCell[], index: number, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
      const heights = cells.map((cell, i) => { const c = cellOf(cell); doc.font(bold || c.bold ? 'Helvetica-Bold' : 'Helvetica'); return doc.heightOfString(c.text || ' ', { width: columns[i].width - pad * 2 }); });
      const rowPad = size <= 8 ? 2.5 : 5;
      const h = Math.max(...heights) + rowPad * 2;
      if (this.ensure(h + 24)) header();
      if (index % 2 === 1 && !bold) doc.rect(PDF.L, this.y, PDF.W, h).fill(C.soft);
      let x = PDF.L;
      cells.forEach((cell, i) => {
        const c = cellOf(cell);
        doc.font(bold || c.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(c.color ?? C.ink)
          .text(c.text, x + pad, this.y + rowPad, { width: columns[i].width - pad * 2, align: c.align ?? columns[i].align ?? 'left' });
        x += columns[i].width;
      });
      this.y += h;
    };
    header();
    if (!rows.length) {
      doc.font('Helvetica').fontSize(9).fillColor(C.mut).text(options.emptyText ?? 'Nenhum registro no período.', PDF.L + pad, this.y + 4, { width: PDF.W - pad * 2 });
      this.y += 26;
    }
    rows.forEach((row, index) => drawRow(row, index));
    if (options.totals) {
      this.ensure(30);
      doc.moveTo(PDF.L, this.y).lineTo(PDF.R, this.y).lineWidth(0.8).strokeColor(C.line).stroke();
      drawRow(options.totals, 0, true);
    }
    this.y += 12;
  }

  /** Bloco escuro de destaque (total da fatura, líquido a receber). */
  total(label: string, value: string, sub?: string) {
    const { doc } = this;
    const w = 250;
    const h = sub ? 62 : 48;
    this.ensure(h + 14);
    doc.roundedRect(PDF.R - w, this.y, w, h, 8).fill(C.ink);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#cbd5e1').text(label.toUpperCase(), PDF.R - w + 14, this.y + 11, { lineBreak: false, characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff').text(value, PDF.R - w + 14, this.y + 23, { width: w - 28, align: 'right', lineBreak: false });
    if (sub) doc.font('Helvetica').fontSize(8.5).fillColor('#cbd5e1').text(sub, PDF.R - w + 14, this.y + 47, { width: w - 28, align: 'right', lineBreak: false });
    this.y += h + 18;
  }

  /** Caixa de aviso colorida, com link opcional. */
  notice(title: string, lines: string[], tone: PdfTone = 'neutral', link?: string) {
    const { doc } = this;
    const { fg, bg } = TONES[tone];
    doc.font('Helvetica').fontSize(9);
    const textH = lines.reduce((sum, line) => sum + doc.heightOfString(line, { width: PDF.W - 28 }) + 3, 0);
    const h = 30 + textH + (link ? 20 : 0);
    this.ensure(h + 14);
    doc.roundedRect(PDF.L, this.y, PDF.W, h, 8).lineWidth(0.8).fillAndStroke(bg, fg);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(fg).text(title, PDF.L + 14, this.y + 11, { width: PDF.W - 28 });
    let ty = this.y + 28;
    doc.font('Helvetica').fontSize(9).fillColor(C.ink);
    lines.forEach((line) => { doc.text(line, PDF.L + 14, ty, { width: PDF.W - 28 }); ty += doc.heightOfString(line, { width: PDF.W - 28 }) + 3; });
    if (link) doc.font('Helvetica-Bold').fontSize(9).fillColor(C.brand).text(link, PDF.L + 14, ty + 2, { width: PDF.W - 28, link, underline: true, lineBreak: false });
    this.y += h + 14;
  }

  /** Linhas de assinatura. */
  signatures(items: Array<{ label: string; sub?: string }>) {
    const { doc } = this;
    this.ensure(70);
    this.y += 28;
    const gap = 30;
    const w = (PDF.W - gap * (items.length - 1)) / items.length;
    items.forEach((item, index) => {
      const x = PDF.L + index * (w + gap);
      doc.moveTo(x, this.y).lineTo(x + w, this.y).lineWidth(0.8).strokeColor(C.gray).stroke();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink).text(item.label, x, this.y + 5, { width: w, align: 'center', lineBreak: false });
      if (item.sub) doc.font('Helvetica').fontSize(8).fillColor(C.mut).text(item.sub, x, this.y + 17, { width: w, align: 'center', lineBreak: false });
    });
    this.y += 34;
  }

  // ───────────── fechamento ─────────────

  /** Desenha o cabeçalho compacto e o rodapé em todas as páginas e devolve o PDF. */
  finish(): Promise<Buffer> {
    const { doc, options } = this;
    const generatedAt = options.generatedAt ?? new Date();
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // rodapé na área da margem: sem isso o pdfkit abriria página nova
      if (i > range.start) this.drawRunningHeader();
      doc.moveTo(PDF.L, 790).lineTo(PDF.R, 790).lineWidth(0.6).strokeColor(C.line).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(C.mut);
      if (options.footerNote) doc.text(options.footerNote, PDF.L, 796, { width: PDF.W, lineBreak: false, ellipsis: true });
      doc.text(`Gerado em ${fmt.dateTime(generatedAt)}${options.footerId ? ` · ${options.footerId}` : ''}`, PDF.L, 808, { width: PDF.W - 90, lineBreak: false, ellipsis: true });
      doc.text(`Página ${i - range.start + 1} de ${range.count}`, PDF.R - 90, 808, { width: 90, align: 'right', lineBreak: false });
    }
    doc.end();
    return this.sink.done;
  }
}
