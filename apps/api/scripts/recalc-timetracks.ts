import { PrismaClient } from '@prisma/client';
import { TimeCalculationRulesService } from '../src/modules/time-track/time-calculation-rules';

const prisma = new PrismaClient();
const calculator = new TimeCalculationRulesService();

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Data invalida: ${value}`);
  return date;
}

function clockMinutes(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const toMinutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + (minute || 0); };
  return (toMinutes(end) - toMinutes(start) + 1440) % 1440;
}

function workloadMinutes(value?: string | null): number | null {
  if (!value) return null;
  const [hour, minute] = value.split(':').map(Number);
  return Number.isFinite(hour) ? hour * 60 + (minute || 0) : null;
}

async function resolveContext(track: any) {
  const employee = track.employee;
  const [baseRule, assignment, exception, holiday] = await Promise.all([
    employee.workScheduleRuleId
      ? prisma.workScheduleRule.findFirst({ where: { id: employee.workScheduleRuleId, companyId: track.companyId } })
      : Promise.resolve(null),
    prisma.userSchedule.findFirst({
      where: {
        companyId: track.companyId,
        employeeId: track.employeeId,
        startDate: { lte: track.date },
        OR: [{ endDate: null }, { endDate: { gte: track.date } }],
      },
      include: { schedule: true },
      orderBy: { startDate: 'desc' },
    }),
    prisma.scheduleException.findFirst({ where: { companyId: track.companyId, employeeId: track.employeeId, date: track.date } }),
    prisma.holiday.findFirst({ where: { OR: [{ companyId: track.companyId }, { companyId: null }], date: track.date } }),
  ]);

  if (!assignment?.schedule) return { employee, rule: baseRule, holiday };
  const schedule = assignment.schedule;
  let entry = assignment.entryTimeOverride ?? schedule.entryTime ?? employee.standardEntry ?? baseRule?.standardEntry;
  const lunchStart = assignment.lunchStartTimeOverride ?? schedule.lunchStartTime ?? employee.standardLunchStart;
  const lunchReturn = assignment.lunchReturnTimeOverride ?? schedule.lunchReturnTime ?? employee.standardLunchReturn;
  let exit = assignment.exitTimeOverride ?? schedule.exitTime ?? employee.standardExit ?? baseRule?.standardExit;
  let restDays = [...schedule.restDays];

  if (exception?.exceptionType === 'COMPENSACAO') {
    entry = exception.altEntryTime ?? entry;
    exit = exception.altExitTime ?? exit;
  } else if (exception) {
    restDays = Array.from(new Set([...restDays, track.date.getUTCDay()]));
  }
  if (schedule.scaleType === '12x36' && schedule.cycleStartDate) {
    const elapsedDays = Math.floor((track.date.getTime() - schedule.cycleStartDate.getTime()) / 86400000);
    if (Math.abs(elapsedDays) % 2 === 1) restDays = Array.from(new Set([...restDays, track.date.getUTCDay()]));
  }

  const scheduledMinutes = clockMinutes(entry, lunchStart || exit) + clockMinutes(lunchReturn, exit);
  const dailyMinutes = scheduledMinutes || baseRule?.dailyMinutes || workloadMinutes(employee.dailyWorkload) || 480;
  return {
    employee: {
      ...employee,
      standardEntry: entry,
      standardLunchStart: lunchStart,
      standardLunchReturn: lunchReturn,
      standardExit: exit,
      workScale: schedule.scaleType,
      isNightShift: schedule.isNightShift,
    },
    rule: {
      ...(baseRule || {}),
      standardEntry: entry,
      standardLunchStart: lunchStart,
      standardLunchReturn: lunchReturn,
      standardExit: exit,
      dailyMinutes,
      weeklyMinutes: dailyMinutes * Math.max(1, schedule.workDays.length),
      breakMinutes: clockMinutes(lunchStart, lunchReturn) || baseRule?.breakMinutes || 60,
      restDaysOfWeek: restDays,
      workScale: schedule.scaleType,
      cycleWorkHours: schedule.cycleWorkHours,
      nightShiftEnabled: schedule.isNightShift || baseRule?.nightShiftEnabled,
      nightStartTime: schedule.nightStartTime ?? baseRule?.nightStartTime ?? '22:00',
      nightEndTime: schedule.nightEndTime ?? baseRule?.nightEndTime ?? '05:00',
    },
    holiday,
  };
}

async function main() {
  const from = parseDate(process.env.RECALC_FROM);
  const to = parseDate(process.env.RECALC_TO);
  const tracks = await prisma.timeTrack.findMany({
    where: from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : undefined,
    include: { employee: true },
    orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
  });
  console.log(`Recalculando ${tracks.length} registros de ponto...`);

  let updated = 0;
  for (const track of tracks) {
    const context = await resolveContext(track);
    const calculation = calculator.calculateTotals({
      entryTime: track.entry,
      lunchStartTime: track.lunchStart,
      lunchReturnTime: track.lunchReturn,
      exitTime: track.exit,
      workDate: track.date,
      manualReason: track.manualReason,
    }, context.employee, context.rule, context.holiday);
    const totalOvertime = calculation.overtime50Minutes + calculation.overtime100Minutes;
    const paymentRatio = track.overtimeHandling === 'BANK' ? 0 : track.overtimeHandling === 'SPLIT' ? 0.5 : 1;

    await prisma.timeTrack.update({
      where: { id: track.id },
      data: {
        entry: calculation.sortedTimestamps?.entryTime ?? track.entry,
        lunchStart: calculation.sortedTimestamps?.lunchStartTime ?? track.lunchStart,
        lunchReturn: calculation.sortedTimestamps?.lunchReturnTime ?? track.lunchReturn,
        exit: calculation.sortedTimestamps?.exitTime ?? track.exit,
        totalWorked: calculation.totalWorkedMinutes,
        dailyBalance: calculation.dailyBalanceMinutes,
        overtime50Minutes: calculation.overtime50Minutes,
        overtime100Minutes: calculation.overtime100Minutes,
        nightShiftMinutes: calculation.nightShiftMinutes,
        incidentType: calculation.incidentType,
        lateMinutes: calculation.lateMinutes,
        earlyLeaveMinutes: calculation.earlyLeaveMinutes,
        absenceMinutes: calculation.absenceMinutes,
        overtimeExceedsLimit: calculation.overtimeExceedsLimit,
        overtimeApprovalStatus: calculation.overtimeApprovalNeeded ? 'PENDING' : track.overtimeApprovalStatus === 'REJECTED' ? 'REJECTED' : 'APPROVED',
        overtimeBankMinutes: Math.round(totalOvertime * (1 - paymentRatio)),
        overtimePaymentMinutes: Math.round(totalOvertime * paymentRatio),
      },
    });
    updated++;
  }
  console.log(`Recálculo concluído: ${updated} registros atualizados.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());