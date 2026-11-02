import type { PrismaService } from '../../database/prisma.service';

/** Bloqueios que um pagamento pode desfazer: inadimplencia e esperas do primeiro pagamento/estorno. Qualquer outro motivo (seguranca, voluntario, plataforma, cancelamento) exige decisao humana. */
export const PAYMENT_REACTIVATION_REASONS = [
  'inadimplencia',
  'pagamento_cancelado_ou_estornado',
  'trial_aguardando_pagamento',
  'aguardando_primeiro_pagamento',
  'aguardando_pagamento',
] as const;

export const REACTIVATED_COMPANY = { billingStatus: 'ACTIVE' as const, status: 'ACTIVE' as const, isActive: true, suspensionReason: null };

/** Meia-noite UTC do dia civil de Sao Paulo (o vencimento e guardado como data a meia-noite UTC). */
export function saoPauloToday(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return new Date(`${parts}T00:00:00.000Z`);
}

/**
 * Decide o que um pagamento confirmado faz com a empresa. Devolve `{}` (nada muda) quando:
 *  - a conta esta cancelada;
 *  - ela esta bloqueada por motivo que nao e falta de pagamento;
 *  - ainda ha outra fatura vencida (OVERDUE, ou OPEN com vencimento anterior a hoje).
 */
export async function companyDataAfterPayment(
  prisma: Pick<PrismaService, 'company' | 'platformInvoice'>,
  companyId: string,
  paidInvoiceId?: string,
): Promise<typeof REACTIVATED_COMPANY | Record<string, never>> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { billingStatus: true, status: true, isActive: true, suspensionReason: true } });
  if (!company) return {};
  if (company.billingStatus === 'CANCELED' || company.status === 'CANCELLED') return {};
  const blocked = company.status !== 'ACTIVE' || company.isActive === false;
  if (blocked && !(PAYMENT_REACTIVATION_REASONS as readonly string[]).includes(company.suspensionReason ?? '')) return {};
  const stillOverdue = await prisma.platformInvoice.count({
    where: {
      companyId,
      deletedAt: null,
      ...(paidInvoiceId ? { id: { not: paidInvoiceId } } : {}),
      OR: [{ status: 'OVERDUE' }, { status: 'OPEN', dueDate: { lt: saoPauloToday() } }],
    },
  });
  return stillOverdue > 0 ? {} : REACTIVATED_COMPANY;
}
