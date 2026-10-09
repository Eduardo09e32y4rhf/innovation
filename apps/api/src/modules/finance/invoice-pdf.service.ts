import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { createPdfSink, safeFileName } from '../../common/pdf/pdf-response';
import { AsaasService } from './asaas.service';
import { INVOICE_LOGO_PNG_BASE64 } from './invoice-logo';
import { barCodeFromDigitableLine, itfBars } from './itf-barcode';

/** O que o cliente precisa para pagar direto pelo PDF. Tudo opcional: o Asaas só devolve o que a cobrança já tem. */
export interface InvoicePaymentData {
  pixPayload?: string | null;
  /** PNG em base64 do QR Code Pix. */
  pixQrImage?: string | null;
  /** Linha digitável do boleto (47 dígitos). */
  boletoLine?: string | null;
  /** Código de barras (44 dígitos). */
  barCode?: string | null;
  bankSlipUrl?: string | null;
}

export interface InvoicePdfInput {
  payment?: InvoicePaymentData | null;
  invoice: {
    id: string; description: string | null; amount: unknown; dueDate: Date; createdAt: Date; paidAt: Date | null; status: string;
    billingType: string; invoiceUrl: string | null; refundedAmount?: unknown; invoiceNumber?: string | null; invoiceSeries?: string | null; fiscalPdfUrl?: string | null;
  };
  company: {
    name: string; legalName?: string | null; document?: string | null; email?: string | null; phone?: string | null;
    street?: string | null; streetNumber?: string | null; addressComplement?: string | null; neighborhood?: string | null;
    city?: string | null; state?: string | null; zipCode?: string | null; address?: string | null;
  };
}

const C = {
  ink: '#0f172a', mut: '#64748b', line: '#e2e8f0', soft: '#f8fafc', brand: '#6d28d9', gray: '#475569', grayBg: '#f1f5f9',
  ok: '#047857', okBg: '#ecfdf5', warn: '#b45309', warnBg: '#fffbeb', bad: '#be123c', badBg: '#fff1f2',
};
const L = 40;
const R = 555;
const W = R - L;

const money = (value: unknown) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
/** Vencimento é data (sem hora): UTC. Emissão e pagamento têm hora: horário de Brasília. */
const dayUtc = (value?: Date | null) => (value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value)) : '-');
const dayBr = (value?: Date | null) => (value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value)) : '-');
const dateTimeBr = (value: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(value);

export function formatDocument(value?: string | null) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return value ? String(value) : '';
}

const BILLING_LABEL: Record<string, string> = { PIX: 'Pix', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão de crédito', UNDEFINED: 'Pix, boleto ou cartão' };

export function invoiceNumber(id: string) {
  return id.slice(0, 8).toUpperCase();
}

/** Situação exibida no documento (uma só, em linguagem clara). */
export function invoiceSituation(invoice: Pick<InvoicePdfInput['invoice'], 'status' | 'amount' | 'refundedAmount'>) {
  const refunded = Number(invoice.refundedAmount ?? 0);
  if (invoice.status === 'CANCELED') return { key: 'CANCELED' as const, label: 'CANCELADA', fg: C.gray, bg: C.grayBg };
  if (invoice.status === 'PAID') {
    if (refunded > 0 && refunded + 0.005 >= Number(invoice.amount)) return { key: 'REFUNDED' as const, label: 'REEMBOLSADA', fg: C.brand, bg: '#f5f3ff' };
    return { key: 'PAID' as const, label: 'PAGA', fg: C.ok, bg: C.okBg };
  }
  if (invoice.status === 'OVERDUE') return { key: 'OVERDUE' as const, label: 'VENCIDA', fg: C.bad, bg: C.badBg };
  return { key: 'OPEN' as const, label: 'EM ABERTO', fg: C.warn, bg: C.warnBg };
}

@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
  ) {}

  /**
   * Pix, linha digitável e código de barras direto do Asaas. Nunca lança nem trava: o Asaas fora do ar (ou sem boleto ainda,
   * quando a cobrança é "cliente escolhe") só significa um PDF sem essa parte, que continua trazendo o link de pagamento.
   */
  private async loadPayment(invoice: { id: string; status: string; provider?: string | null; asaasPaymentId?: string | null; billingType: string }): Promise<InvoicePaymentData | null> {
    if (!['OPEN', 'OVERDUE'].includes(invoice.status) || invoice.provider === 'MERCADOPAGO' || !invoice.asaasPaymentId || !this.asaas.isConfigured()) return null;
    const id = invoice.asaasPaymentId;
    const attempt = <T>(work: Promise<T>): Promise<T | null> => Promise.race([work, new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]).catch(() => null);

    const charge = await attempt(this.asaas.getCharge(id));
    // O tipo muda quando o cliente escolhe a forma de pagamento na página do Asaas: vale o que está lá, não o que gravamos.
    const type = charge?.billingType ?? invoice.billingType;
    const [boleto, pix] = await Promise.all([
      type === 'BOLETO' ? attempt(this.asaas.getIdentificationField(id)) : null,
      ['PIX', 'UNDEFINED'].includes(type) ? attempt(this.asaas.getPixQrCode(id)) : null,
    ]);
    const boletoLine = boleto?.identificationField ?? null;
    return {
      pixPayload: pix?.payload ?? null,
      pixQrImage: pix?.encodedImage ?? null,
      boletoLine,
      barCode: boleto?.barCode?.replace(/\D/g, '') || (boletoLine ? barCodeFromDigitableLine(boletoLine) : null),
      bankSlipUrl: charge?.bankSlipUrl ?? null,
    };
  }

  /** Gera o PDF de uma fatura. Com `companyId`, só enxerga faturas dessa empresa (visão do cliente). */
  async forInvoice(id: string, companyId?: string) {
    const invoice = await this.prisma.platformInvoice.findFirst({
      where: { id, deletedAt: null, ...(companyId ? { companyId } : {}) },
      include: { company: true },
    });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada.');
    const payment = await this.loadPayment(invoice);
    const buffer = await this.render({ invoice, company: invoice.company, payment });
    return { buffer, filename: `fatura-${invoiceNumber(invoice.id)}-${safeFileName(invoice.company.name, 'empresa')}.pdf` };
  }

  private env(key: string) {
    return (this.config.get<string>(key) ?? '').trim();
  }

  /** Dados do emitente vêm do ambiente: assim o CNPJ e o endereço reais não ficam no código. */
  private issuer() {
    const site = this.env('INVOICE_ISSUER_SITE') || this.env('APP_URL');
    return {
      name: this.env('INVOICE_ISSUER_NAME') || 'Innovation RH',
      legalName: this.env('INVOICE_ISSUER_LEGAL_NAME'),
      document: formatDocument(this.env('INVOICE_ISSUER_DOCUMENT')),
      address: this.env('INVOICE_ISSUER_ADDRESS'),
      email: this.env('INVOICE_ISSUER_EMAIL'),
      phone: this.env('INVOICE_ISSUER_PHONE'),
      site: site.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    };
  }

  async render(input: InvoicePdfInput): Promise<Buffer> {
    const { invoice, company, payment } = input;
    const issuer = this.issuer();
    const number = invoiceNumber(invoice.id);
    const situation = invoiceSituation(invoice);
    const amount = Number(invoice.amount);
    const refunded = Number(invoice.refundedAmount ?? 0);

    const pdfkit = await import('pdfkit');
    const doc = new pdfkit.default({
      size: 'A4', margins: { top: 36, bottom: 30, left: L, right: 40 }, bufferPages: true,
      info: { Title: `Fatura ${number}`, Author: issuer.name, Subject: 'Fatura de assinatura' },
    });
    const sink = createPdfSink();
    doc.pipe(sink.stream);

    // ---------- cabeçalho ----------
    doc.image(Buffer.from(INVOICE_LOGO_PNG_BASE64, 'base64'), L, 34, { width: 58 });
    doc.font('Helvetica-Bold').fontSize(17).fillColor(C.ink).text(issuer.name, L + 70, 42, { lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.mut).text('Tecnologia · Gestão · Resultados', L + 70, 64, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(24).fillColor(C.brand).text('FATURA', R - 220, 36, { width: 220, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(9.5).fillColor(C.mut).text(`Nº ${number}`, R - 220, 66, { width: 220, align: 'right', lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(8.5);
    const chipW = doc.widthOfString(situation.label) + 22;
    doc.roundedRect(R - chipW, 82, chipW, 17, 8.5).fill(situation.bg);
    doc.fillColor(situation.fg).text(situation.label, R - chipW, 87, { width: chipW, align: 'center', lineBreak: false });
    doc.moveTo(L, 108).lineTo(R, 108).lineWidth(2).strokeColor(C.brand).stroke();

    // ---------- emitente e cliente ----------
    const clientAddress = [
      [company.street, company.streetNumber, company.addressComplement].filter(Boolean).join(', '),
      company.neighborhood,
      [company.city, company.state].filter(Boolean).join(' - '),
      company.zipCode ? `CEP ${company.zipCode}` : '',
    ].filter(Boolean).join(' · ') || company.address || '';

    const party = (title: string, name: string, lines: string[], x: number, y: number, width: number, height: number) => {
      doc.roundedRect(x, y, width, height, 8).lineWidth(0.8).fillAndStroke(C.soft, C.line);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.brand).text(title, x + 12, y + 10, { lineBreak: false, characterSpacing: 0.8 });
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.ink).text(name, x + 12, y + 24, { width: width - 24 });
      doc.font('Helvetica').fontSize(8.8).fillColor(C.gray);
      lines.forEach((line) => doc.text(line, x + 12, doc.y + 1.5, { width: width - 24 }));
    };
    const issuerLines = [
      issuer.document && `CNPJ: ${issuer.document}`,
      issuer.address,
      [issuer.email, issuer.phone].filter(Boolean).join(' · '),
      issuer.site,
    ].filter(Boolean) as string[];
    const clientLines = [
      company.document && `CNPJ/CPF: ${formatDocument(company.document)}`,
      clientAddress,
      [company.email, company.phone].filter(Boolean).join(' · '),
    ].filter(Boolean) as string[];

    const gap = 14;
    const boxW = (W - gap) / 2;
    const heightOf = (name: string, lines: string[]) => {
      doc.font('Helvetica-Bold').fontSize(10.5);
      let h = 24 + doc.heightOfString(name, { width: boxW - 24 }) + 10;
      doc.font('Helvetica').fontSize(8.8);
      lines.forEach((line) => { h += doc.heightOfString(line, { width: boxW - 24 }) + 1.5; });
      return Math.max(h, 70);
    };
    const issuerName = issuer.legalName || issuer.name;
    const clientName = company.legalName || company.name;
    const partyH = Math.max(heightOf(issuerName, issuerLines), heightOf(clientName, clientLines));
    const partyY = 124;
    party('EMITENTE', issuerName, issuerLines, L, partyY, boxW, partyH);
    party('CLIENTE', clientName, clientLines, L + boxW + gap, partyY, boxW, partyH);

    // ---------- datas ----------
    let y = partyY + partyH + 16;
    const cells = [
      { label: 'EMISSÃO', value: dayBr(invoice.createdAt) },
      { label: 'VENCIMENTO', value: dayUtc(invoice.dueDate) },
      { label: 'PAGAMENTO', value: invoice.paidAt ? dayBr(invoice.paidAt) : 'Pendente' },
      { label: 'FORMA DE PAGAMENTO', value: BILLING_LABEL[invoice.billingType] ?? 'Pix, boleto ou cartão' },
    ];
    const cellW = W / cells.length;
    cells.forEach((cell, index) => {
      const x = L + index * cellW;
      doc.font('Helvetica-Bold').fontSize(7.2).fillColor(C.mut).text(cell.label, x, y, { width: cellW - 8, lineBreak: false, characterSpacing: 0.6 });
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.ink).text(cell.value, x, y + 12, { width: cellW - 8, lineBreak: false });
    });
    y += 38;

    // ---------- itens ----------
    doc.roundedRect(L, y, W, 22, 6).fill(C.grayBg);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gray);
    doc.text('DESCRIÇÃO', L + 12, y + 7, { lineBreak: false, characterSpacing: 0.6 });
    doc.text('VALOR', R - 112, y + 7, { width: 100, align: 'right', lineBreak: false, characterSpacing: 0.6 });
    y += 28;

    const row = (label: string, value: string, options: { color?: string; sub?: string } = {}) => {
      doc.font('Helvetica').fontSize(10).fillColor(options.color ?? C.ink);
      const h = doc.heightOfString(label, { width: W - 150 });
      doc.text(label, L + 12, y, { width: W - 150 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(options.color ?? C.ink).text(value, R - 112, y, { width: 100, align: 'right', lineBreak: false });
      let rowH = h;
      if (options.sub) {
        doc.font('Helvetica').fontSize(8.2).fillColor(C.mut).text(options.sub, L + 12, y + h + 1, { width: W - 150 });
        rowH += doc.heightOfString(options.sub, { width: W - 150 }) + 1;
      }
      y += rowH + 8;
      doc.moveTo(L, y).lineTo(R, y).lineWidth(0.6).strokeColor(C.line).stroke();
      y += 8;
    };
    row(invoice.description?.trim() || 'Mensalidade Innovation RH', money(amount), { sub: 'Licença de uso do sistema (assinatura mensal).' });
    if (refunded > 0) row('Devolução ao cliente', `- ${money(refunded)}`, { color: C.brand });

    // ---------- total ----------
    const totalW = 230;
    const totalH = refunded > 0 ? 66 : 50;
    doc.roundedRect(R - totalW, y + 4, totalW, totalH, 8).fill(C.ink);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#cbd5e1').text('TOTAL DA FATURA', R - totalW + 14, y + 14, { lineBreak: false, characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff').text(money(amount), R - totalW + 14, y + 26, { width: totalW - 28, align: 'right', lineBreak: false });
    if (refunded > 0) doc.font('Helvetica').fontSize(8.5).fillColor('#cbd5e1').text(`Valor líquido após devolução: ${money(Math.max(0, amount - refunded))}`, R - totalW + 14, y + 52, { width: totalW - 28, align: 'right', lineBreak: false });
    y += totalH + 22;

    // ---------- situação / como pagar ----------
    const notice = (title: string, lines: string[], fg: string, bg: string, link?: string) => {
      doc.font('Helvetica').fontSize(9);
      const textH = lines.reduce((sum, line) => sum + doc.heightOfString(line, { width: W - 28 }) + 3, 0);
      const h = 30 + textH + (link ? 20 : 0);
      doc.roundedRect(L, y, W, h, 8).lineWidth(0.8).fillAndStroke(bg, fg);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(fg).text(title, L + 14, y + 11, { width: W - 28 });
      let ty = y + 28;
      doc.font('Helvetica').fontSize(9).fillColor(C.ink);
      lines.forEach((line) => { doc.text(line, L + 14, ty, { width: W - 28 }); ty += doc.heightOfString(line, { width: W - 28 }) + 3; });
      if (link) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.brand).text(link, L + 14, ty + 2, { width: W - 28, link, underline: true, lineBreak: false });
      }
      y += h + 14;
    };

    if (situation.key === 'PAID' || situation.key === 'REFUNDED') {
      notice(situation.key === 'PAID' ? 'Pagamento confirmado' : 'Fatura reembolsada', [
        invoice.paidAt ? `Pagamento recebido em ${dayBr(invoice.paidAt)}. Obrigado!` : 'Pagamento recebido. Obrigado!',
      ], C.ok, C.okBg);
    } else if (situation.key === 'CANCELED') {
      notice('Fatura cancelada', ['Esta fatura foi cancelada e não deve ser paga.'], C.gray, C.grayBg);
    } else {
      const overdue = situation.key === 'OVERDUE';
      notice(overdue ? `Fatura vencida em ${dayUtc(invoice.dueDate)}` : 'Como pagar', [
        overdue ? 'Regularize o quanto antes para evitar o bloqueio do acesso da sua equipe.' : `Pague até ${dayUtc(invoice.dueDate)} para manter o acesso ativo.`,
        invoice.invoiceUrl ? 'Pix, boleto ou cartão: use o link abaixo. O pagamento é confirmado automaticamente.' : 'O link de pagamento será disponibilizado em instantes. Em caso de dúvida, fale com o suporte.',
      ], overdue ? C.bad : C.warn, overdue ? C.badBg : C.warnBg, invoice.invoiceUrl ?? undefined);

      // Pagar direto pelo PDF: QR Code e copia e cola do Pix, linha digitável e código de barras do boleto.
      const hasPix = Boolean(payment?.pixPayload);
      const hasBoleto = Boolean(payment?.boletoLine || payment?.barCode);
      if (payment && (hasPix || hasBoleto)) {
        const panelGap = 12;
        const pixW = hasBoleto ? 190 : W;
        const boletoW = hasPix ? W - pixW - panelGap : W;
        const pixTextW = hasBoleto ? pixW - 24 : pixW - 132;

        doc.font('Courier').fontSize(6.3);
        const payloadH = hasPix ? doc.heightOfString(payment.pixPayload!, { width: pixTextW }) : 0;
        const pixNeed = hasBoleto ? 26 + 102 + 12 + payloadH + 14 : Math.max(26 + 96, 26 + 12 + payloadH) + 14;
        const boletoNeed = 26 + 12 + 28 + 52 + (payment.bankSlipUrl ? 28 : 8) + 8;
        const panelH = Math.max(hasPix ? pixNeed : 0, hasBoleto ? boletoNeed : 0);
        const panel = (x: number, w: number, title: string) => {
          doc.roundedRect(x, y, w, panelH, 8).lineWidth(0.8).fillAndStroke('#ffffff', C.line);
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.brand).text(title, x + 12, y + 11, { lineBreak: false, characterSpacing: 0.8 });
        };

        if (hasPix) {
          panel(L, pixW, 'PAGUE COM PIX');
          const top = y + 26;
          if (payment.pixQrImage) {
            try { doc.image(Buffer.from(payment.pixQrImage, 'base64'), L + 12, top, { width: 96 }); } catch { /* QR ilegível: segue só com o copia e cola */ }
          }
          const textX = hasBoleto ? L + 12 : L + 120;
          const textY = hasBoleto ? top + 102 : top;
          doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink).text('Pix copia e cola', textX, textY, { width: pixTextW, lineBreak: false });
          doc.font('Courier').fontSize(6.3).fillColor(C.gray).text(payment.pixPayload!, textX, textY + 12, { width: pixTextW });
        }

        if (hasBoleto) {
          const bx = hasPix ? L + pixW + panelGap : L;
          panel(bx, boletoW, 'BOLETO BANCÁRIO');
          let by = y + 26;
          if (payment.boletoLine) {
            doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink).text('Linha digitável', bx + 12, by, { width: boletoW - 24, lineBreak: false });
            doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(payment.boletoLine, bx + 12, by + 12, { width: boletoW - 24, lineBreak: false });
            by += 32;
          }
          if (payment.barCode && payment.barCode.length === 44) {
            const { bars, total } = itfBars(payment.barCode);
            const barsW = Math.min(boletoW - 24, 292); // 292 pt = 103 mm, a largura da norma do boleto
            const unit = barsW / total;
            bars.forEach((bar) => doc.rect(bx + 12 + bar.x * unit, by + 6, bar.width * unit, 40));
            doc.fillColor('#000000').fill();
            by += 54;
          }
          if (payment.bankSlipUrl) {
            doc.font('Helvetica').fontSize(8).fillColor(C.mut).text('Boleto em PDF:', bx + 12, by, { lineBreak: false });
            doc.font('Helvetica').fontSize(7.5).fillColor(C.brand).text(payment.bankSlipUrl, bx + 12, by + 11, { width: boletoW - 24, link: payment.bankSlipUrl, underline: true, lineBreak: false });
          }
        }
        y += panelH + 14;
      }
    }

    if (invoice.invoiceNumber || invoice.fiscalPdfUrl) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(`Nota fiscal de serviço${invoice.invoiceNumber ? ` nº ${invoice.invoiceNumber}` : ''}${invoice.invoiceSeries ? ` (série ${invoice.invoiceSeries})` : ''}`, L, y, { width: W });
      y = doc.y + 2;
      if (invoice.fiscalPdfUrl) doc.font('Helvetica').fontSize(8.5).fillColor(C.brand).text(invoice.fiscalPdfUrl, L, y, { width: W, link: invoice.fiscalPdfUrl, underline: true, lineBreak: false });
    }

    // ---------- rodapé em todas as páginas ----------
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // o rodapé fica na área da margem: sem isso o pdfkit abriria uma página nova
      doc.moveTo(L, 790).lineTo(R, 790).lineWidth(0.6).strokeColor(C.line).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(C.mut);
      doc.text('Este documento é um demonstrativo de cobrança e não substitui a nota fiscal de serviço.', L, 796, { width: W, lineBreak: false });
      doc.text(`Gerado em ${dateTimeBr(new Date())} · Fatura ${invoice.id}`, L, 808, { width: W - 90, lineBreak: false });
      doc.text(`Página ${i + 1} de ${range.count}`, R - 90, 808, { width: 90, align: 'right', lineBreak: false });
    }

    doc.end();
    return sink.done;
  }
}
