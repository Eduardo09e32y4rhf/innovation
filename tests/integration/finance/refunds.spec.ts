import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../apps/api/src/database/prisma.service';
import { PaymentRefundService } from '../../../apps/api/src/modules/finance/payment-refund.service';

describe('Devoluções concorrentes com PostgreSQL real e provedores simulados', () => {
  const prisma = new PrismaService();
  const asaas = { isConfigured: () => true, refundPayment: vi.fn(), getCharge: vi.fn() };
  const mp = { isConfigured: () => true, refund: vi.fn(), getRefunds: vi.fn() };
  const service = new PaymentRefundService(prisma, asaas as never, mp as never);
  let companyId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !target.pathname.includes('test')) throw new Error('Este teste exige banco local identificado como teste.');
    await prisma.$connect();
    const company = await prisma.company.create({ data: { name: `refund-test-${randomUUID()}` } });
    companyId = company.id;
    const invoice = await prisma.platformInvoice.create({ data: { companyId, amount: 100, status: 'PAID', provider: 'MERCADOPAGO', mpPaymentId: randomUUID(), dueDate: new Date(), billingType: 'PIX' } });
    invoiceId = invoice.id;
  });
  afterAll(async () => {
    if (invoiceId) {
      await prisma.auditLog.deleteMany({ where: { companyId } });
      await prisma.paymentRefund.deleteMany({ where: { invoiceId } });
      await prisma.platformInvoice.delete({ where: { id: invoiceId } });
    }
    if (companyId) await prisma.company.delete({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it('reserva o saldo, rejeita corrida e repete a mesma chave sem novo POST', async () => {
    mp.refund.mockResolvedValue({ id: 'refund-1', status: 'pending', amount: 60 });
    mp.getRefunds.mockResolvedValue([{ id: 'refund-1', status: 'pending', amount: 60 }]);
    const first = await service.request(invoiceId, { amount: 60, reason: 'Ajuste acordado', key: 'one' });
    expect(first.status).toBe('PENDING');
    await expect(service.request(invoiceId, { amount: 50, reason: 'Outro ajuste', key: 'two' })).rejects.toMatchObject({ status: 409 });
    const repeated = await service.request(invoiceId, { amount: 60, reason: 'Ajuste acordado', key: 'one' });
    expect(repeated.id).toBe(first.id);
    expect(mp.refund).toHaveBeenCalledTimes(1);
    await expect(service.request(invoiceId, { amount: 70, reason: 'Ajuste acordado', key: 'one' })).rejects.toMatchObject({ status: 409 });
    mp.getRefunds.mockResolvedValue([{ id: 'refund-1', status: 'approved', amount: 60 }]);
    await service.reconcile(invoiceId);
    const settled = await prisma.platformInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(Number(settled.refundedAmount)).toBe(60);
    expect(settled.status).toBe('PAID');
    await expect(service.request(invoiceId, { amount: 50, reason: 'Excede saldo', key: 'over' })).rejects.toMatchObject({ status: 400 });
  });

  it('mantém reserva após timeout e impede segunda operação', async () => {
    mp.refund.mockRejectedValue(new Error('timeout'));
    const operation = await service.request(invoiceId, { amount: 20, reason: 'Nova devolução', key: 'timeout' });
    expect(operation.status).toBe('UNKNOWN');
    await expect(service.request(invoiceId, { amount: 20, reason: 'Outra solicitação', key: 'retry' })).rejects.toMatchObject({ status: 409 });
    expect(mp.refund).toHaveBeenCalledTimes(2);
  });
});
