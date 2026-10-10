import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PdfReport, type PdfCell, type PdfTone } from '../../common/pdf/pdf-report';
import { safeFileName } from '../../common/pdf/pdf-response';
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
  /** Número do boleto no banco. */
  nossoNumero?: string | null;
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
    // Boleto e "cliente escolhe" tentam os dois: o boleto do Asaas costuma trazer o Pix junto, e a linha digitável só existe se o boleto já foi gerado.
    const [boleto, pix] = await Promise.all([
      ['BOLETO', 'UNDEFINED'].includes(type) ? attempt(this.asaas.getIdentificationField(id)) : null,
      ['PIX', 'UNDEFINED', 'BOLETO'].includes(type) ? attempt(this.asaas.getPixQrCode(id)) : null,
    ]);
    const boletoLine = boleto?.identificationField ?? null;
    return {
      pixPayload: pix?.payload ?? null,
      pixQrImage: pix?.encodedImage ?? null,
      boletoLine,
      barCode: boleto?.barCode?.replace(/\D/g, '') || (boletoLine ? barCodeFromDigitableLine(boletoLine) : null),
      bankSlipUrl: charge?.bankSlipUrl ?? null,
      nossoNumero: boleto?.nossoNumero ?? null,
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

  /**
   * Ficha de compensação (a parte destacável do boleto). A linha digitável, o código de barras e o nosso número vêm do banco (Asaas),
   * então o pagamento continua válido com a logo da empresa. O que o Asaas não devolve (beneficiário, agência, código do beneficiário)
   * vem do ambiente, copiado do boleto oficial: nunca é inventado.
   */
  private drawBoletoSlip(doc: any, data: { invoice: InvoicePdfInput['invoice']; payment: InvoicePaymentData; clientName: string; clientDocument: string; clientAddress: string }) {
    const { invoice, payment, clientName, clientDocument, clientAddress } = data;
    const cfg = {
      beneficiary: this.env('INVOICE_BOLETO_BENEFICIARY'),
      document: formatDocument(this.env('INVOICE_BOLETO_BENEFICIARY_DOCUMENT')),
      agency: this.env('INVOICE_BOLETO_AGENCY'),
      wallet: this.env('INVOICE_BOLETO_WALLET') || '1',
      species: this.env('INVOICE_BOLETO_SPECIES') || 'DM',
      accept: this.env('INVOICE_BOLETO_ACCEPT') || 'N',
    };
    const barCode = payment.barCode ?? '';
    const bankCode = barCode.slice(0, 3);
    const H = 26;
    let y = 62;

    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.ink).text('Boleto bancário', L, y, { lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.mut).text('Pague em qualquer banco, no aplicativo do seu banco ou em casa lotérica. Fatura nº ' + invoiceNumber(invoice.id) + '.', L, y + 18, { width: W, lineBreak: false });
    y += 44;
    doc.moveTo(L, y).lineTo(R, y).dash(3, { space: 3 }).lineWidth(0.7).strokeColor(C.mut).stroke().undash();
    y += 12;

    const cell = (x: number, yy: number, w: number, h: number, label: string, value?: string, options: { bold?: boolean; size?: number; align?: 'right' | 'left' } = {}) => {
      doc.rect(x, yy, w, h).lineWidth(0.7).strokeColor('#334155').stroke();
      doc.font('Helvetica').fontSize(5.8).fillColor('#475569').text(label, x + 3, yy + 2.5, { width: w - 6, lineBreak: false });
      if (value) doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.size ?? 8.5).fillColor(C.ink).text(value, x + 4, yy + 12, { width: w - 8, lineBreak: false, align: options.align ?? 'left' });
    };
    const row = (yy: number, h: number, parts: Array<{ w: number; label: string; value?: string; bold?: boolean; align?: 'right' | 'left' }>) => {
      let x = L;
      parts.forEach((part) => { cell(x, yy, part.w, h, part.label, part.value, { bold: part.bold, align: part.align }); x += part.w; });
    };

    // cabeçalho: logo, código do banco e linha digitável
    const headH = 34;
    doc.rect(L, y, W, headH).lineWidth(0.7).strokeColor('#334155').stroke();
    doc.image(Buffer.from(INVOICE_LOGO_PNG_BASE64, 'base64'), L + 6, y + 4, { width: 26 });
    doc.moveTo(L + 40, y + 5).lineTo(L + 40, y + headH - 5).lineWidth(0.8).strokeColor('#334155').stroke();
    doc.moveTo(L + 84, y + 5).lineTo(L + 84, y + headH - 5).stroke();
    doc.font('Helvetica-Bold').fontSize(15).fillColor(C.ink).text(bankCode, L + 40, y + 9, { width: 44, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.ink).text(payment.boletoLine ?? '', L + 90, y + 12, { width: W - 96, align: 'right', lineBreak: false });
    y += headH;

    const due = dayUtc(invoice.dueDate);
    const amount = money(invoice.amount);
    row(y, H, [{ w: 395, label: 'Local de pagamento', value: 'Pagável em qualquer banco ou casa lotérica' }, { w: 120, label: 'Data de vencimento', value: due, bold: true, align: 'right' }]); y += H;
    row(y, H, [{ w: 285, label: 'Beneficiário', value: cfg.beneficiary }, { w: 110, label: 'CPF/CNPJ do beneficiário', value: cfg.document }, { w: 120, label: 'Agência / Código beneficiário', value: cfg.agency }]); y += H;
    row(y, H, [
      { w: 80, label: 'Data do documento', value: dayBr(invoice.createdAt) }, { w: 95, label: 'Nº do documento', value: invoiceNumber(invoice.id) },
      { w: 55, label: 'Espécie doc.', value: cfg.species }, { w: 40, label: 'Aceite', value: cfg.accept },
      { w: 125, label: 'Data processamento', value: dayBr(invoice.createdAt) }, { w: 120, label: 'Nosso número', value: payment.nossoNumero ?? '' },
    ]); y += H;
    row(y, H, [
      { w: 80, label: 'Uso do banco' }, { w: 55, label: 'Carteira', value: cfg.wallet }, { w: 70, label: 'Espécie', value: 'REAL' },
      { w: 100, label: 'Quantidade' }, { w: 90, label: 'Valor' }, { w: 120, label: '(=) Valor do documento', value: amount, bold: true, align: 'right' },
    ]); y += H;

    // instruções (esquerda) e acréscimos (direita)
    const instrH = 104;
    cell(L, y, 395, instrH, 'Instruções (texto de responsabilidade do beneficiário)');
    const instructions = [invoice.description ?? '', invoice.invoiceUrl ? `Fatura disponível em: ${invoice.invoiceUrl.replace(/^https?:\/\//, '')}` : ''].filter(Boolean);
    doc.font('Helvetica').fontSize(8.5).fillColor(C.ink).text(instructions.join('\n'), L + 6, y + 14, { width: 383, height: instrH - 18 });
    ['(-) Desconto / Abatimentos', '(-) Outras deduções', '(+) Mora / Multa', '(+) Outros acréscimos', '(=) Valor cobrado'].forEach((label, index) => cell(L + 395, y + index * (instrH / 5), 120, instrH / 5, label));
    y += instrH;

    // pagador
    const payerH = 46;
    cell(L, y, W, payerH, 'Pagador');
    doc.font('Helvetica').fontSize(8.5).fillColor(C.ink).text(`${clientName}${clientDocument ? `, CNPJ/CPF: ${clientDocument}` : ''}`, L + 6, y + 13, { width: W - 12, lineBreak: false });
    if (clientAddress) doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(clientAddress, L + 6, y + 26, { width: W - 12, lineBreak: false });
    y += payerH;

    // código de barras
    const barH = 58;
    doc.rect(L, y, W, barH).lineWidth(0.7).strokeColor('#334155').stroke();
    const { bars, total } = itfBars(barCode);
    const unit = 292 / total; // 292 pt = 103 mm, a largura da norma do boleto
    bars.forEach((bar) => doc.rect(L + 8 + bar.x * unit, y + 9, bar.width * unit, 40));
    doc.fillColor('#000000').fill();
    doc.font('Helvetica').fontSize(8).fillColor(C.ink).text('Autenticação mecânica', L + 320, y + 12, { width: 100, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink).text('FICHA DE COMPENSAÇÃO', L + 320, y + 34, { width: W - 328, align: 'right', lineBreak: false });
    y += barH + 10;

    doc.font('Helvetica').fontSize(7.5).fillColor(C.mut).text(
      bankCode === '461' ? 'Boleto registrado no Asaas Instituição de Pagamento S.A. (banco 461). O valor e o vencimento são os da fatura; confira o beneficiário no seu aplicativo antes de pagar.' : `Boleto registrado no banco ${bankCode}. Confira o beneficiário no seu aplicativo antes de pagar.`,
      L, y, { width: W },
    );
  }

  async render(input: InvoicePdfInput): Promise<Buffer> {
    const { invoice, company, payment } = input;
    const issuer = this.issuer();
    const number = invoiceNumber(invoice.id);
    const situation = invoiceSituation(invoice);
    const amount = Number(invoice.amount);
    const refunded = Number(invoice.refundedAmount ?? 0);
    const tone: Record<string, PdfTone> = { PAID: 'ok', REFUNDED: 'info', OVERDUE: 'bad', CANCELED: 'neutral', OPEN: 'warn' };

    const report = await PdfReport.create({
      title: 'Fatura', number: `Nº ${number}`, chip: { label: situation.label, tone: tone[situation.key] ?? 'neutral' },
      brand: { platform: true, name: issuer.name },
      footerNote: 'Este documento é um demonstrativo de cobrança e não substitui a nota fiscal de serviço.', footerId: `Fatura ${invoice.id}`,
    });
    const { doc } = report;

    const clientAddress = [
      [company.street, company.streetNumber, company.addressComplement].filter(Boolean).join(', '),
      company.neighborhood,
      [company.city, company.state].filter(Boolean).join(' - '),
      company.zipCode ? `CEP ${company.zipCode}` : '',
    ].filter(Boolean).join(' · ') || company.address || '';
    const clientName = company.legalName || company.name;

    report.parties(
      { title: 'EMITENTE', name: issuer.legalName || issuer.name, lines: [issuer.document && `CNPJ: ${issuer.document}`, issuer.address, [issuer.email, issuer.phone].filter(Boolean).join(' · '), issuer.site].filter(Boolean) as string[] },
      { title: 'CLIENTE', name: clientName, lines: [company.document && `CNPJ/CPF: ${formatDocument(company.document)}`, clientAddress, [company.email, company.phone].filter(Boolean).join(' · ')].filter(Boolean) as string[] },
    );
    report.fields([
      ['Emissão', dayBr(invoice.createdAt)], ['Vencimento', dayUtc(invoice.dueDate)],
      ['Pagamento', invoice.paidAt ? dayBr(invoice.paidAt) : 'Pendente'], ['Forma de pagamento', BILLING_LABEL[invoice.billingType] ?? 'Pix, boleto ou cartão'],
    ]);

    const rows: PdfCell[][] = [[{ text: `${invoice.description?.trim() || 'Mensalidade Innovation RH'}\nLicença de uso do sistema (assinatura mensal).` }, { text: money(amount), bold: true }]];
    if (refunded > 0) rows.push([{ text: 'Devolução ao cliente', color: C.brand }, { text: `- ${money(refunded)}`, color: C.brand, bold: true }]);
    report.table([{ label: 'Descrição', width: 395 }, { label: 'Valor', width: 120, align: 'right' }], rows);
    report.total('Total da fatura', money(amount), refunded > 0 ? `Valor líquido após devolução: ${money(Math.max(0, amount - refunded))}` : undefined);

    // ---------- situação / como pagar ----------
    let slipPending = false;
    if (situation.key === 'PAID' || situation.key === 'REFUNDED') {
      report.notice(situation.key === 'PAID' ? 'Pagamento confirmado' : 'Fatura reembolsada', [invoice.paidAt ? `Pagamento recebido em ${dayBr(invoice.paidAt)}. Obrigado!` : 'Pagamento recebido. Obrigado!'], 'ok');
    } else if (situation.key === 'CANCELED') {
      report.notice('Fatura cancelada', ['Esta fatura foi cancelada e não deve ser paga.'], 'neutral');
    } else {
      const overdue = situation.key === 'OVERDUE';
      report.notice(overdue ? `Fatura vencida em ${dayUtc(invoice.dueDate)}` : 'Como pagar', [
        overdue ? 'Regularize o quanto antes para evitar o bloqueio do acesso da sua equipe.' : `Pague até ${dayUtc(invoice.dueDate)} para manter o acesso ativo.`,
        invoice.invoiceUrl ? 'Pix, boleto ou cartão: use o link abaixo. O pagamento é confirmado automaticamente.' : 'O link de pagamento será disponibilizado em instantes. Em caso de dúvida, fale com o suporte.',
      ], overdue ? 'bad' : 'warn', invoice.invoiceUrl ?? undefined);

      // Pagar direto pelo PDF: Pix (QR Code e copia e cola) e, quando existe boleto, a linha digitável (a ficha completa vai na página seguinte).
      const hasPix = Boolean(payment?.pixPayload);
      const hasBoletoLine = Boolean(payment?.boletoLine || payment?.barCode);
      slipPending = Boolean(payment?.barCode && payment.barCode.length === 44);

      if (payment && hasPix) {
        const pixTextW = W - 132;
        doc.font('Courier').fontSize(6.3);
        const payloadH = doc.heightOfString(payment.pixPayload!, { width: pixTextW });
        const panelH = Math.max(26 + 96, 26 + 12 + payloadH) + 14;
        report.ensure(panelH + 12);
        const y = report.y;
        doc.roundedRect(L, y, W, panelH, 8).lineWidth(0.8).fillAndStroke('#ffffff', C.line);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.brand).text('PAGUE COM PIX', L + 12, y + 11, { lineBreak: false, characterSpacing: 0.8 });
        const top = y + 26;
        if (payment.pixQrImage) {
          try { doc.image(Buffer.from(payment.pixQrImage, 'base64'), L + 12, top, { width: 96 }); } catch { /* QR ilegível: segue só com o copia e cola */ }
        }
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink).text('Pix copia e cola', L + 120, top, { width: pixTextW, lineBreak: false });
        doc.font('Courier').fontSize(6.3).fillColor(C.gray).text(payment.pixPayload!, L + 120, top + 12, { width: pixTextW });
        report.y = y + panelH + 12;
      }

      if (payment && hasBoletoLine) {
        const stripH = 50;
        report.ensure(stripH + 12);
        const y = report.y;
        doc.roundedRect(L, y, W, stripH, 8).lineWidth(0.8).fillAndStroke('#ffffff', C.line);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.brand).text('BOLETO BANCÁRIO', L + 12, y + 11, { lineBreak: false, characterSpacing: 0.8 });
        if (payment.boletoLine) doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text(payment.boletoLine, L + 12, y + 24, { width: W - 24, lineBreak: false });
        if (slipPending) doc.font('Helvetica').fontSize(7.8).fillColor(C.mut).text('Ficha de compensação com código de barras na página seguinte.', L + 12, y + 38, { width: W - 24, lineBreak: false });
        report.y = y + stripH + 12;
      }
    }

    if (invoice.invoiceNumber || invoice.fiscalPdfUrl) {
      report.ensure(40);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(`Nota fiscal de serviço${invoice.invoiceNumber ? ` nº ${invoice.invoiceNumber}` : ''}${invoice.invoiceSeries ? ` (série ${invoice.invoiceSeries})` : ''}`, L, report.y, { width: W });
      report.y = doc.y + 2;
      if (invoice.fiscalPdfUrl) doc.font('Helvetica').fontSize(8.5).fillColor(C.brand).text(invoice.fiscalPdfUrl, L, report.y, { width: W, link: invoice.fiscalPdfUrl, underline: true, lineBreak: false });
    }

    // ---------- página seguinte: ficha de compensação do boleto ----------
    if (slipPending && payment) {
      report.newPage();
      this.drawBoletoSlip(doc, { invoice, payment, clientName, clientDocument: formatDocument(company.document), clientAddress });
    }

    return report.finish();
  }
}