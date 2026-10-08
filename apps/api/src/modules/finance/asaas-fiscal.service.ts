import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AsaasService, type AsaasFiscalInvoice } from './asaas.service';

/** Nota já resolvida: não precisa consultar o Asaas de novo. */
const FINAL_STATUS = ['AUTHORIZED', 'CANCELED'];
/** Nota que falhou ou foi cancelada: pode ser agendada de novo pelo financeiro. */
const RETRYABLE_STATUS = ['ERROR', 'CANCELED', 'CANCELLATION_DENIED'];

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/**
 * NFS-e pelo Asaas. Liga com ASAAS_NFSE_ENABLED=true e o serviço municipal (ASAAS_NFSE_SERVICE_ID ou ASAAS_NFSE_SERVICE_CODE).
 * Cada fatura paga recebe uma nota agendada para o dia; o webhook INVOICE_* e a rotina diária trazem número, PDF e XML.
 */
@Injectable()
export class AsaasFiscalService {
  private readonly logger = new Logger(AsaasFiscalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly config: ConfigService,
  ) {}

  private env(key: string) {
    return (this.config.get<string>(key) ?? '').trim();
  }

  private percent(key: string) {
    const value = Number(this.env(key).replace(',', '.') || 0);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 0;
  }

  /** O que falta para emitir. Vazio = pronto. */
  missing() {
    const missing: string[] = [];
    if (!this.asaas.isConfigured()) missing.push('ASAAS_API_KEY');
    if (this.env('ASAAS_NFSE_ENABLED').toLowerCase() !== 'true') missing.push('ASAAS_NFSE_ENABLED=true');
    if (!this.env('ASAAS_NFSE_SERVICE_ID') && !this.env('ASAAS_NFSE_SERVICE_CODE')) missing.push('ASAAS_NFSE_SERVICE_ID ou ASAAS_NFSE_SERVICE_CODE');
    return missing;
  }

  isEnabled() {
    return this.missing().length === 0;
  }

  health() {
    const missing = this.missing();
    return {
      enabled: missing.length === 0,
      missing,
      service: this.env('ASAAS_NFSE_SERVICE_ID') || this.env('ASAAS_NFSE_SERVICE_CODE') || null,
      webhookEvents: ['INVOICE_CREATED', 'INVOICE_UPDATED', 'INVOICE_SYNCHRONIZED', 'INVOICE_AUTHORIZED', 'INVOICE_PROCESSING_CANCELLATION', 'INVOICE_CANCELED', 'INVOICE_CANCELLATION_DENIED', 'INVOICE_ERROR'],
    };
  }

  /** Testa na conta do Asaas se os dados fiscais (prefeitura, certificado) foram preenchidos. */
  async checkAccount() {
    if (!this.asaas.isConfigured()) return { ok: false, message: 'Asaas não configurado.' };
    try {
      const info = await this.asaas.getFiscalInfo();
      return info?.municipalInscription || info?.rpsSerie
        ? { ok: true, message: 'Dados fiscais encontrados na conta do Asaas.' }
        : { ok: false, message: 'Preencha os dados fiscais em Asaas > Notas fiscais > Configurações.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Não foi possível consultar os dados fiscais.' };
    }
  }

  /** Grava a nota do Asaas na fatura. Usado pelo webhook e pela consulta ativa. */
  async persist(invoiceId: string, nf: AsaasFiscalInvoice, event?: string) {
    const status = nf.status ?? (event === 'INVOICE_AUTHORIZED' ? 'AUTHORIZED' : event === 'INVOICE_CANCELED' ? 'CANCELED' : undefined);
    return this.prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: {
        asaasInvoiceId: nf.id,
        invoiceNumber: nf.number || undefined,
        invoiceSeries: nf.series || undefined,
        invoiceValidationCode: nf.validationCode || undefined,
        fiscalPdfUrl: nf.pdfUrl || undefined,
        fiscalXmlUrl: nf.xmlUrl || undefined,
        invoiceStatus: status,
        nfeStatus: status,
        invoiceAuthorizedAt: status === 'AUTHORIZED' ? new Date() : undefined,
        invoiceCanceledAt: status === 'CANCELED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Garante a nota de uma fatura paga: puxa a que já existe no Asaas ou agenda uma nova.
   * Nunca lança: falha de nota não pode travar pagamento nem webhook. Devolve o que aconteceu.
   */
  async ensureForInvoice(invoiceId: string, options: { force?: boolean } = {}): Promise<{ result: 'SKIPPED' | 'PULLED' | 'SCHEDULED' | 'FAILED'; message: string }> {
    const invoice = await this.prisma.platformInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true, provider: true, asaasPaymentId: true, asaasInvoiceId: true, invoiceStatus: true, amount: true, description: true, deletedAt: true },
    });
    if (!invoice || invoice.deletedAt) return { result: 'SKIPPED', message: 'Fatura não encontrada.' };
    if (invoice.provider === 'MERCADOPAGO' || !invoice.asaasPaymentId) return { result: 'SKIPPED', message: 'A nota automática só vale para cobranças do Asaas. Anexe a nota manualmente.' };
    if (!this.asaas.isConfigured()) return { result: 'SKIPPED', message: 'Asaas não configurado.' };

    try {
      // 1) Já tem nota ligada: só atualiza enquanto não chegou a um estado final.
      if (invoice.asaasInvoiceId && !(options.force && RETRYABLE_STATUS.includes(invoice.invoiceStatus ?? ''))) {
        if (FINAL_STATUS.includes(invoice.invoiceStatus ?? '') && !options.force) return { result: 'SKIPPED', message: 'Nota já finalizada.' };
        const nf = await this.asaas.getFiscalInvoice(invoice.asaasInvoiceId);
        if (nf?.id) await this.persist(invoice.id, nf);
        return { result: 'PULLED', message: `Nota ${nf?.status ?? 'consultada'}.` };
      }

      // 2) Procura nota criada direto no painel do Asaas (ou por emissão automática da conta) antes de agendar outra.
      const found = (await this.asaas.listInvoicesByPayment(invoice.asaasPaymentId)).data ?? [];
      const usable = found.find((nf) => !RETRYABLE_STATUS.includes(nf.status ?? ''));
      if (usable) {
        await this.persist(invoice.id, usable);
        return { result: 'PULLED', message: `Nota ${usable.status ?? 'encontrada'} no Asaas.` };
      }

      if (invoice.status !== 'PAID') return { result: 'SKIPPED', message: 'A nota é emitida depois do pagamento.' };
      const missing = this.missing();
      if (missing.length) return { result: 'SKIPPED', message: `Emissão de nota desligada. Falta: ${missing.join(', ')}.` };

      // 3) Agenda a nota para hoje.
      const serviceId = this.env('ASAAS_NFSE_SERVICE_ID');
      const nf = await this.asaas.scheduleFiscalInvoice({
        payment: invoice.asaasPaymentId,
        serviceDescription: this.env('ASAAS_NFSE_DESCRIPTION') || `Licença de uso do sistema Innovation RH. ${invoice.description ?? ''}`.trim(),
        observations: this.env('ASAAS_NFSE_OBSERVATIONS') || 'Serviço de software (SaaS) prestado por assinatura.',
        value: Number(invoice.amount),
        deductions: 0,
        effectiveDate: today(),
        externalReference: `inv:${invoice.id}`,
        ...(serviceId
          ? { municipalServiceId: serviceId }
          : { municipalServiceCode: this.env('ASAAS_NFSE_SERVICE_CODE'), municipalServiceName: this.env('ASAAS_NFSE_SERVICE_NAME') || 'Licenciamento ou cessão de direito de uso de programas de computação' }),
        taxes: {
          retainIss: this.env('ASAAS_NFSE_RETAIN_ISS').toLowerCase() === 'true',
          iss: this.percent('ASAAS_NFSE_ISS'),
          cofins: this.percent('ASAAS_NFSE_COFINS'),
          csll: this.percent('ASAAS_NFSE_CSLL'),
          inss: this.percent('ASAAS_NFSE_INSS'),
          ir: this.percent('ASAAS_NFSE_IR'),
          pis: this.percent('ASAAS_NFSE_PIS'),
        },
      });
      if (!nf?.id) return { result: 'FAILED', message: 'O Asaas não devolveu a nota agendada.' };
      await this.persist(invoice.id, { ...nf, status: nf.status ?? 'SCHEDULED' });
      return { result: 'SCHEDULED', message: 'Nota agendada no Asaas. O número e o PDF chegam quando a prefeitura autorizar.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Nota fiscal da fatura ${invoiceId}: ${message}`);
      await this.prisma.platformInvoice.update({ where: { id: invoiceId }, data: { invoiceStatus: 'ERROR', nfeStatus: 'ERROR' } }).catch(() => undefined);
      return { result: 'FAILED', message };
    }
  }

  /** Rotina: agenda notas que faltam e puxa as que ainda não foram autorizadas (cobre webhook perdido). */
  async reconcileRecent(days = 45, limit = 200) {
    if (!this.asaas.isConfigured()) return { checked: 0 };
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const invoices = await this.prisma.platformInvoice.findMany({
      where: {
        status: 'PAID', deletedAt: null, provider: { not: 'MERCADOPAGO' }, asaasPaymentId: { not: null }, paidAt: { gte: since },
        OR: [{ asaasInvoiceId: null }, { invoiceStatus: null }, { invoiceStatus: { notIn: [...FINAL_STATUS, 'ERROR'] } }],
      },
      select: { id: true },
      orderBy: { paidAt: 'desc' },
      take: limit,
    });
    for (const invoice of invoices) await this.ensureForInvoice(invoice.id);
    return { checked: invoices.length };
  }
}
