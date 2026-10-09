import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { formatDocument, InvoicePdfService, invoiceNumber, invoiceSituation } from './invoice-pdf.service';

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

function make() {
  return new InvoicePdfService(config as never, {} as never);
}

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

  it('aguenta cliente sem endereço, sem documento e descrição longa', async () => {
    const buffer = await make().render({
      invoice: { ...base, description: 'x '.repeat(400) },
      company: { name: 'Sem dados' },
    });
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('forInvoice recusa fatura de outra empresa', async () => {
    const prisma = { platformInvoice: { findFirst: async (args: { where: { companyId?: string } }) => (args.where.companyId === 'outra' ? null : { ...base, company }) } };
    const service = new InvoicePdfService(config as never, prisma as never);
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
