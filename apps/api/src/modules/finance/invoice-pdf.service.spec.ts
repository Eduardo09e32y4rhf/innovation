import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { formatDocument, InvoicePdfService, invoiceNumber, invoiceSituation } from './invoice-pdf.service';
import { INVOICE_LOGO_PNG_BASE64 } from './invoice-logo';

const env: Record<string, string> = {
  INVOICE_ISSUER_NAME: 'Innovation RH', INVOICE_ISSUER_LEGAL_NAME: 'Innovation Tecnologia Ltda', INVOICE_ISSUER_DOCUMENT: '12345678000195',
  INVOICE_ISSUER_ADDRESS: 'Rua Exemplo, 100 · Centro · São Paulo - SP', INVOICE_ISSUER_EMAIL: 'financeiro@innovationia.com.br', APP_URL: 'https://innovationia.com.br',
};
const config = { get: (key: string) => env[key] };

const company = {
  name: 'Padaria Pão Quente', legalName: 'Pão Quente Alimentos Ltda', document: '11222333000181', email: 'contato@paoquente.com.br', phone: '(11) 98888-7777',
  street: 'Av. Brasil', streetNumber: '1500', addressComplement: 'Sala 3', neighborhood: 'Jardim América', city: 'São Paulo', state: 'SP', zipCode: '01430-001',
};
const base = {
  id: '3606a7ff-e486-46e3-9f49-3bad5688c59d', description: 'Mensalidade basico (3 usuarios) + rateio upgrade de 1 para 3 usuarios (36 de 38 dias)', amount: 264.67,
  dueDate: new Date('2026-10-16T00:00:00Z'), createdAt: new Date('2026-10-08T20:41:35Z'), paidAt: null, status: 'OPEN', billingType: 'UNDEFINED',
  invoiceUrl: 'https://sandbox.asaas.com/i/abc123xyz', refundedAmount: 0, invoiceNumber: null, invoiceSeries: null, fiscalPdfUrl: null,
};

const asaasOff = { isConfigured: () => false };
function make(asaas: unknown = asaasOff) {
  return new InvoicePdfService(config as never, {} as never, asaas as never);
}

// Boleto de exemplo (banco 001): linha digitável e código de barras equivalentes.
const BOLETO_LINE = '00190.50095 40144.816069 06809.350314 3 37370000000100';
const BAR_CODE = '00193373700000001000500940144816060680935031';
const PIX = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000520400005303986540510.005802BR5913Innovation RH6009SAO PAULO62070503***63041D3D';

describe('InvoicePdfService', () => {
  it('gera PDF válido de uma página para fatura em aberto, paga e vencida', async () => {
    const out = process.env.INVOICE_PDF_OUT;
    if (out) mkdirSync(out, { recursive: true });
    const cases = {
      aberta: base,
      paga: { ...base, status: 'PAID', paidAt: new Date('2026-10-10T14:30:00Z'), invoiceNumber: '1042', invoiceSeries: 'A', fiscalPdfUrl: 'https://www.asaas.com/nf/1042.pdf' },
      vencida: { ...base, status: 'OVERDUE', dueDate: new Date('2026-09-01T00:00:00Z') },
      reembolsada: { ...base, status: 'PAID', paidAt: new Date('2026-10-10T14:30:00Z'), refundedAmount: 100 },
      cancelada: { ...base, status: 'CANCELED', invoiceUrl: null },
    };
    for (const [name, invoice] of Object.entries(cases)) {
      const buffer = await make().render({ invoice, company });
      expect(buffer.subarray(0, 4).toString('latin1'), name).toBe('%PDF');
      const pages = (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      expect(pages, `${name}: deve caber em uma página`).toBe(1);
      if (out) writeFileSync(join(out, `fatura-${name}.pdf`), buffer);
    }
  });

  it('mostra Pix (QR + copia e cola) e boleto (linha digitável + código de barras) quando o Asaas fornece', async () => {
    const out = process.env.INVOICE_PDF_OUT;
    const buffer = await make().render({
      invoice: { ...base, billingType: 'BOLETO' }, company,
      payment: { pixPayload: PIX, pixQrImage: INVOICE_LOGO_PNG_BASE64, boletoLine: BOLETO_LINE, barCode: BAR_CODE, bankSlipUrl: 'https://www.asaas.com/b/pdf/abc123' },
    });
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect((buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length, 'deve caber em uma página').toBe(1);
    if (out) writeFileSync(join(out, 'fatura-aberta-pagavel.pdf'), buffer);
    const onlyPix = await make().render({ invoice: base, company, payment: { pixPayload: PIX, pixQrImage: INVOICE_LOGO_PNG_BASE64 } });
    expect((onlyPix.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(1);
    if (out) writeFileSync(join(out, 'fatura-aberta-so-pix.pdf'), onlyPix);
  });

  describe('dados de pagamento vindos do Asaas (forInvoice)', () => {
    const open = { ...base, company, provider: 'ASAAS', asaasPaymentId: 'pay_1' };
    const build = (invoice: Record<string, unknown>, asaas: Record<string, unknown>) => {
      const prisma = { platformInvoice: { findFirst: async () => invoice } };
      return new InvoicePdfService(config as never, prisma as never, { isConfigured: () => true, ...asaas } as never);
    };

    it('cobrança BOLETO: busca a linha digitável, não o Pix', async () => {
      const asaas = {
        getCharge: vi.fn().mockResolvedValue({ billingType: 'BOLETO', bankSlipUrl: 'https://x/b.pdf' }),
        getIdentificationField: vi.fn().mockResolvedValue({ identificationField: BOLETO_LINE, barCode: BAR_CODE }),
        getPixQrCode: vi.fn(),
      };
      const result = await build({ ...open, billingType: 'BOLETO' }, asaas).forInvoice(base.id);
      expect(result.buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
      expect(asaas.getIdentificationField).toHaveBeenCalled();
      expect(asaas.getPixQrCode).not.toHaveBeenCalled();
    });

    it('"cliente escolhe": só o Pix (boleto ainda não existe)', async () => {
      const asaas = {
        getCharge: vi.fn().mockResolvedValue({ billingType: 'UNDEFINED' }),
        getIdentificationField: vi.fn(),
        getPixQrCode: vi.fn().mockResolvedValue({ payload: PIX, encodedImage: INVOICE_LOGO_PNG_BASE64 }),
      };
      await build({ ...open, billingType: 'UNDEFINED' }, asaas).forInvoice(base.id);
      expect(asaas.getPixQrCode).toHaveBeenCalled();
      expect(asaas.getIdentificationField).not.toHaveBeenCalled();
    });

    it('se o cliente escolheu boleto no Asaas, vale o tipo de lá, não o gravado aqui', async () => {
      const asaas = {
        getCharge: vi.fn().mockResolvedValue({ billingType: 'BOLETO' }),
        getIdentificationField: vi.fn().mockResolvedValue({ identificationField: BOLETO_LINE }),
        getPixQrCode: vi.fn(),
      };
      await build({ ...open, billingType: 'UNDEFINED' }, asaas).forInvoice(base.id);
      expect(asaas.getIdentificationField).toHaveBeenCalled();
    });

    it('Asaas fora do ar não impede o download: o PDF sai sem a parte de pagamento', async () => {
      const asaas = { getCharge: vi.fn().mockRejectedValue(new Error('timeout')), getIdentificationField: vi.fn().mockRejectedValue(new Error('x')), getPixQrCode: vi.fn().mockRejectedValue(new Error('x')) };
      const result = await build(open, asaas).forInvoice(base.id);
      expect(result.buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
    });

    it('fatura paga não consulta o Asaas', async () => {
      const asaas = { getCharge: vi.fn(), getIdentificationField: vi.fn(), getPixQrCode: vi.fn() };
      await build({ ...open, status: 'PAID', paidAt: new Date() }, asaas).forInvoice(base.id);
      expect(asaas.getCharge).not.toHaveBeenCalled();
    });
  });

  it('aguenta cliente sem endereço, sem documento e descrição longa', async () => {
    const buffer = await make().render({
      invoice: { ...base, description: 'x '.repeat(400) },
      company: { name: 'Sem dados' },
    });
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('forInvoice recusa fatura de outra empresa', async () => {
    const prisma = { platformInvoice: { findFirst: async (args: { where: { companyId?: string } }) => (args.where.companyId === 'outra' ? null : { ...base, company }) } };
    const service = new InvoicePdfService(config as never, prisma as never, asaasOff as never);
    await expect(service.forInvoice(base.id, 'outra')).rejects.toBeInstanceOf(NotFoundException);
    const ok = await service.forInvoice(base.id, 'minha');
    expect(ok.filename).toBe('fatura-3606A7FF-Padaria-Pao-Quente.pdf');
  });

  it('formata CNPJ, CPF e número da fatura', () => {
    expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatDocument('12345678909')).toBe('123.456.789-09');
    expect(invoiceNumber(base.id)).toBe('3606A7FF');
  });

  it('situação única: paga, reembolsada, vencida, cancelada e em aberto', () => {
    expect(invoiceSituation({ status: 'PAID', amount: 10, refundedAmount: 0 }).key).toBe('PAID');
    expect(invoiceSituation({ status: 'PAID', amount: 10, refundedAmount: 10 }).key).toBe('REFUNDED');
    expect(invoiceSituation({ status: 'OVERDUE', amount: 10 }).key).toBe('OVERDUE');
    expect(invoiceSituation({ status: 'CANCELED', amount: 10 }).key).toBe('CANCELED');
    expect(invoiceSituation({ status: 'OPEN', amount: 10 }).key).toBe('OPEN');
  });
});
