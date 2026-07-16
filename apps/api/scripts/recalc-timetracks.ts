import { PrismaClient } from '@prisma/client';
import { TimeCalculationRulesService } from './src/modules/time-track/time-calculation-rules';

const prisma = new PrismaClient();
const calcRules = new TimeCalculationRulesService();

async function main() {
  console.log('Recalculating all TimeTracks...');
  const timeTracks = await prisma.timeTrack.findMany({
    include: {
      employee: {
        include: { company: true }
      }
    }
  });

  let updated = 0;
  for (const track of timeTracks) {
    if (!track.employee) continue;

    const rule = track.employee.workScheduleRuleId 
      ? await prisma.workScheduleRule.findUnique({ where: { id: track.employee.workScheduleRuleId } })
      : null;

    const holiday = await prisma.holiday.findFirst({
      where: { companyId: track.companyId, date: track.date }
    });

    const calculation = calcRules.calculateTotals(
      {
        entryTime: track.entry,
        lunchStartTime: track.lunchStart,
        lunchReturnTime: track.lunchReturn,
        exitTime: track.exit,
        workDate: track.date,
        manualReason: track.manualReason
      },
      track.employee,
      rule,
      holiday
    );

    await prisma.timeTrack.update({
      where: { id: track.id },
      data: {
        entry: calculation.sortedTimestamps?.entryTime || track.entry,
        lunchStart: calculation.sortedTimestamps?.lunchStartTime || track.lunchStart,
        lunchReturn: calculation.sortedTimestamps?.lunchReturnTime || track.lunchReturn,
        exit: calculation.sortedTimestamps?.exitTime || track.exit,
        totalWorked: calculation.totalWorkedMinutes,
        dailyBalance: calculation.dailyBalanceMinutes,
        overtime50Minutes: calculation.overtime50Minutes,
        overtime100Minutes: calculation.overtime100Minutes,
        nightShiftMinutes: calculation.nightShiftMinutes,
        incidentType: calculation.incidentType,
        lateMinutes: calculation.lateMinutes,
        absenceMinutes: calculation.absenceMinutes,
        overtimeExceedsLimit: calculation.overtimeExceedsLimit,
        overtimeApprovalStatus: calculation.overtimeApprovalNeeded ? 'PENDING' : track.overtimeApprovalStatus,
        overtimePaymentMinutes: calculation.overtime50Minutes + calculation.overtime100Minutes,
      }
    });
    updated++;
  }
  
  console.log(`Successfully recalculated ${updated} TimeTrack records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
