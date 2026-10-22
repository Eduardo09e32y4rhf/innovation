import { TimeCalculationRulesService } from './time-calculation-rules';
import { PayrollCalculationService } from './payroll-calculation.service';

// CLT art. 73 §1º (hora noturna de 52min30s), §2º (22h-5h, +20%) e §5º / Sumula 60 II TST (prorrogacao de jornada integralmente noturna).
describe('hora noturna reduzida: ponto -> folha', () => {
  const rules = new TimeCalculationRulesService();
  const payroll = new PayrollCalculationService();
  const at = (day: string, time: string) => new Date(`${day}T${time}:00-03:00`);
  const nightRule = { dailyMinutes: 420, weeklyMinutes: 2640, breakMinutes: 0, restDaysOfWeek: [0], maxDailyOvertimeMinutes: 120, nightShiftEnabled: true };
  const employee = (entry: string, exit: string, workload = '07:00') => ({ dailyWorkload: workload, standardEntry: entry, standardExit: exit, workScale: '6x1', isNightShift: true });
  const run = (entry: string, exitDay: string, exit: string, emp: any, rule = nightRule) => rules.calculateTotals({
    workDate: at('2026-07-15', '00:00'),
    entryTime: at('2026-07-15', entry),
    exitTime: at(exitDay, exit),
  }, emp, rule, null);

  it('22:00-05:00 (7h reais) rende 8h noturnas computadas (480 min)', () => {
    expect(run('22:00', '2026-07-16', '05:00', employee('22:00', '05:00')).nightShiftMinutes).toBe(480);
  });

  it('adicional de 20% sobre as 8h computadas: salario 2.200 (R$ 10/h) -> R$ 16,00', () => {
    const night = run('22:00', '2026-07-16', '05:00', employee('22:00', '05:00')).nightShiftMinutes;
    const r = payroll.calculate({
      salary: 2200, weeklyMinutes: 2640, overtime50Minutes: 0, overtime100Minutes: 0, nightShiftMinutes: night,
      absenceMinutes: 0, payableWorkdays: 26, paidRestDays: 4,
    });
    expect(r.hourlyRate).toBe(10);
    expect(r.nightShiftValue).toBe(16);
  });

  it('22:00-07:00 prorrogada: 7h noturnas + 2h prorrogadas = 9h reais -> 617 min computados', () => {
    expect(run('22:00', '2026-07-16', '07:00', employee('22:00', '07:00', '09:00'), { ...nightRule, dailyMinutes: 540 }).nightShiftMinutes).toBe(617);
  });

  it('22:00-03:00: 300 min reais x 60/52,5 = 342,86 -> 343', () => {
    expect(run('22:00', '2026-07-16', '03:00', employee('22:00', '03:00', '05:00'), { ...nightRule, dailyMinutes: 300 }).nightShiftMinutes).toBe(343);
  });

  it('inicio dentro da janela (23:00-05:00): 360 min reais -> 411', () => {
    expect(run('23:00', '2026-07-16', '05:00', employee('23:00', '05:00', '06:00'), { ...nightRule, dailyMinutes: 360 }).nightShiftMinutes).toBe(411);
  });

  it('jornada diurna 08:00-17:00 nao gera noturno', () => {
    const day = { dailyWorkload: '08:00', standardEntry: '08:00', standardLunchStart: '12:00', standardLunchReturn: '13:00', standardExit: '17:00', workScale: '5x2' };
    const r = rules.calculateTotals({
      workDate: at('2026-07-15', '00:00'), entryTime: at('2026-07-15', '08:00'), lunchStartTime: at('2026-07-15', '12:00'),
      lunchReturnTime: at('2026-07-15', '13:00'), exitTime: at('2026-07-15', '17:00'),
    }, day, { ...nightRule, dailyMinutes: 480, nightShiftEnabled: false }, null);
    expect(r.nightShiftMinutes).toBe(0);
  });

  it('sem adicional noturno habilitado na regra nem no cadastro, 22:00-05:00 nao paga noturno', () => {
    const emp = { ...employee('22:00', '05:00'), isNightShift: false };
    expect(run('22:00', '2026-07-16', '05:00', emp, { ...nightRule, nightShiftEnabled: false }).nightShiftMinutes).toBe(0);
  });
});
