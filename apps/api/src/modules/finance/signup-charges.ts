import type { Logger } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service';
import type { AsaasService } from './asaas.service';

/**
 * Depois que a empresa paga a primeira mensalidade, cancela as outras cobranças avulsas de cadastro que ficaram abertas
 * (ex.: geradas por recarga da tela de pagamento). Sem isso o cliente via "Mensalidade - avulsa, pendente" logo depois de pagar.
 * Marca local primeiro: o evento PAYMENT_DELETED que o Asaas manda depois encontra a fatura já cancelada.
 */
export async function cancelRedundantSignupCharges(prisma: PrismaService, asaas: AsaasService, logger: Logger, companyId: string, paidInvoiceId: string) {
  const leftovers = await prisma.platformInvoice.findMany({
    where: { companyId, id: { not: paidInvoiceId }, deletedAt: null, status: { in: ['OPEN', 'OVERDUE'] }, description: { contains: 'avulsa', mode: 'insensitive' } },
    select: { id: true, asaasPaymentId: true },
  });
  for (const invoice of leftovers) {
    await prisma.platformInvoice.update({ where: { id: invoice.id }, data: { status: 'CANCELED', deletedAt: new Date() } });
    if (!invoice.asaasPaymentId) continue;
    try { await asaas.deleteCharge(invoice.asaasPaymentId); }
    catch (error) { logger.warn(`Cobranca avulsa ${invoice.asaasPaymentId} nao foi cancelada no Asaas: ${String(error)}`); }
  }
  return leftovers.length;
}
