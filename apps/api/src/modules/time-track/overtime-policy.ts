import type { PrismaService } from '../../database/prisma.service';

export type OvertimePolicy = 'PAYMENT' | 'BANK';

export interface CompanyOvertimePolicy {
  policy: OvertimePolicy;
  validityMonths: number;
}

export interface OvertimeTrackLike {
  overtime50Minutes?: number | null;
  overtime100Minutes?: number | null;
  overtimeApprovalStatus?: string | null;
  overtimeHandling?: string | null;
  overtimePaymentMinutes?: number | null;
}

/**
 * Fracao da hora extra do dia que vai para o PAGAMENTO na folha (0 a 1). Regra unica do fechamento e da folha.
 * Extra so vale depois de autorizada: pendente ou recusada nunca e paga. O que foi para o banco de horas nao e pago.
 */
export function overtimePaymentRatio(track: OvertimeTrackLike, forcedHandling?: 'PAYMENT' | 'BANK'): number {
  const total = (track.overtime50Minutes || 0) + (track.overtime100Minutes || 0);
  if (!total) return 0;
  if (track.overtimeApprovalStatus !== 'APPROVED') return 0;
  const handling = forcedHandling || track.overtimeHandling;
  if (handling === 'BANK') return 0;
  if (handling === 'SPLIT') return Math.min(1, Math.max(0, (track.overtimePaymentMinutes || 0) / total));
  return 1;
}

export async function getOvertimePolicy(prisma: PrismaService, companyId: string): Promise<CompanyOvertimePolicy> {
  const rule = await prisma.overtimeRule.findUnique({ where: { companyId }, select: { overtimePolicy: true, bankValidityMonths: true } });
  return {
    policy: rule?.overtimePolicy === 'BANK' ? 'BANK' : 'PAYMENT',
    validityMonths: Math.max(1, rule?.bankValidityMonths ?? 3),
  };
}

export function bankWindowStart(validityMonths: number, now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - validityMonths, now.getUTCDate()));
}

/**
 * Saldo do banco de horas, derivado dos dias dentro da validade (padrao 3 meses):
 * creditos de extra aprovada que foi para o banco, menos os debitos (atraso, saida antecipada, falta).
 * DSR, atestado e folga extra tem saldo do dia zero e por isso nunca entram como negativo.
 * Empresa que paga a extra na folha nao tem banco: retorna 0.
 */
export async function bankBalanceMinutes(prisma: PrismaService, companyId: string, employeeIds: string[]): Promise<Map<string, number>> {
  const balances = new Map<string, number>(employeeIds.map((id) => [id, 0]));
  if (employeeIds.length === 0) return balances;
  const { policy, validityMonths } = await getOvertimePolicy(prisma, companyId);
  if (policy !== 'BANK') return balances;
  const since = bankWindowStart(validityMonths);
  const [credits, debits] = await Promise.all([
    prisma.timeTrack.groupBy({
      by: ['employeeId'],
      where: { employeeId: { in: employeeIds }, date: { gte: since }, overtimeApprovalStatus: 'APPROVED' },
      _sum: { overtimeBankMinutes: true },
    }),
    prisma.timeTrack.groupBy({
      by: ['employeeId'],
      where: { employeeId: { in: employeeIds }, date: { gte: since }, dailyBalance: { lt: 0 } },
      _sum: { dailyBalance: true },
    }),
  ]);
  for (const row of credits) balances.set(row.employeeId, (balances.get(row.employeeId) ?? 0) + (row._sum.overtimeBankMinutes ?? 0));
  for (const row of debits) balances.set(row.employeeId, (balances.get(row.employeeId) ?? 0) + (row._sum.dailyBalance ?? 0));
  return balances;
}

export async function bankBalanceOf(prisma: PrismaService, companyId: string, employeeId: string): Promise<number> {
  return (await bankBalanceMinutes(prisma, companyId, [employeeId])).get(employeeId) ?? 0;
}
