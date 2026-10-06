import type { PrismaService } from '../../database/prisma.service';

/** Aceita o client normal e o de transacao. */
type ScheduleDb = Pick<PrismaService, 'schedule'>;

/** Escalas que toda empresa recebe ao ser criada. O usuario pode editar, duplicar ou arquivar. */
export const DEFAULT_SCHEDULES = [
  {
    name: 'Escala 5x2',
    description: 'Segunda a sexta, folga sábado e domingo.',
    scaleType: '5x2',
    entryTime: '08:00', lunchStartTime: '12:00', lunchReturnTime: '13:00', exitTime: '17:00',
    workDays: [1, 2, 3, 4, 5], restDays: [0, 6],
  },
  {
    name: 'Escala 6x1',
    description: 'Segunda a sábado, folga no domingo.',
    scaleType: '6x1',
    entryTime: '08:00', lunchStartTime: '12:00', lunchReturnTime: '13:00', exitTime: '14:20',
    workDays: [1, 2, 3, 4, 5, 6], restDays: [0],
  },
  {
    name: 'Escala 12x36',
    description: '12 horas de trabalho e 36 horas de descanso, alternando os dias.',
    scaleType: '12x36',
    entryTime: '07:00', lunchStartTime: null, lunchReturnTime: null, exitTime: '19:00',
    workDays: [0, 1, 2, 3, 4, 5, 6], restDays: [],
    cycleWorkHours: 12, cycleRestHours: 36,
  },
] as const;

type DefaultScheduleItem = (typeof DEFAULT_SCHEDULES)[number];

/** Linhas prontas para o Prisma (sem companyId); o 12x36 comeca a alternar a partir de hoje. */
export function defaultScheduleRows(items: readonly DefaultScheduleItem[] = DEFAULT_SCHEDULES, today = new Date()) {
  const cycleStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return items.map((item) => ({
    name: item.name,
    description: item.description,
    scaleType: item.scaleType,
    entryTime: item.entryTime,
    lunchStartTime: item.lunchStartTime,
    lunchReturnTime: item.lunchReturnTime,
    exitTime: item.exitTime,
    workDays: [...item.workDays],
    restDays: [...item.restDays],
    ...(item.scaleType === '12x36' ? { cycleWorkHours: 12, cycleRestHours: 36, cycleStartDate: cycleStart } : {}),
  }));
}

/**
 * Cria as escalas padrao que ainda nao existem (por nome). Seguro para chamar mais de uma vez:
 * nunca duplica e nunca altera o que o usuario ja editou.
 */
export async function ensureDefaultSchedules(prisma: ScheduleDb, companyId: string, today = new Date()): Promise<number> {
  const existing = await prisma.schedule.findMany({ where: { companyId, name: { in: DEFAULT_SCHEDULES.map((item) => item.name) } }, select: { name: true } });
  const have = new Set(existing.map((item) => item.name));
  const missing = DEFAULT_SCHEDULES.filter((item) => !have.has(item.name));
  if (missing.length === 0) return 0;
  await prisma.schedule.createMany({ data: defaultScheduleRows(missing, today).map((row) => ({ ...row, companyId })) });
  return missing.length;
}