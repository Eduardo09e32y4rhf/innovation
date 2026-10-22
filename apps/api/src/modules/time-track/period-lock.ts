import { ConflictException } from '@nestjs/common';

const LOCKED_STATUSES = ['APPROVED', 'CLOSED'] as const;
const STATUS_LABEL: Record<string, string> = { APPROVED: 'aprovado', CLOSED: 'fechado' };

interface ClosingDb {
  timeClosing: { findFirst(args: any): Promise<{ id: string; status: string; periodStart: Date; periodEnd: Date } | null> };
}

const br = (date: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);

/** Bloqueia (409) qualquer escrita de ponto em período cujo fechamento já foi aprovado ou concluído: a folha gravada ficaria diferente do ponto. */
export async function assertTimePeriodOpen(prisma: ClosingDb, companyId: string, employeeId: string, date: Date): Promise<void> {
  const locked = await prisma.timeClosing.findFirst({
    where: { companyId, employeeId, status: { in: [...LOCKED_STATUSES] }, periodStart: { lte: date }, periodEnd: { gte: date } },
    select: { id: true, status: true, periodStart: true, periodEnd: true },
  });
  if (!locked) return;
  throw new ConflictException({
    code: 'PERIOD_CLOSED',
    message: `O período ${br(locked.periodStart)} a ${br(locked.periodEnd)} está ${STATUS_LABEL[locked.status] ?? 'fechado'}. Reabra o fechamento, informando o motivo, para alterar o ponto.`,
    closingId: locked.id,
  });
}
