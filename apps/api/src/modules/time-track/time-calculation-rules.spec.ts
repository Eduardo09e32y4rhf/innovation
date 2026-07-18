import { TimeCalculationRulesService } from './time-calculation-rules';

describe('TimeCalculationRulesService - jornada CLT', () => {
  const service = new TimeCalculationRulesService();
  const at = (day: string, time: string) => new Date(`${day}T${time}:00-03:00`);
  const employee = {
    dailyWorkload: '08:00',
    standardEntry: '08:00',
    standardLunchStart: '12:00',
    standardLunchReturn: '13:00',
    standardExit: '17:00',
    workScale: '5x2',
  };
  const rule = {
    dailyMinutes: 480,
    weeklyMinutes: 2400,
    breakMinutes: 60,
    restDaysOfWeek: [0, 6],
    lateToleranceMinutes: 5,
    maxDailyOvertimeMinutes: 120,
    nightShiftEnabled: true,
  };

  it('classifica uma hora de saida antecipada sem transforma-la em atraso', () => {
    const result = service.calculateTotals({
      workDate: at('2026-07-15', '00:00'),
      entryTime: at('2026-07-15', '08:00'),
      lunchStartTime: at('2026-07-15', '12:00'),
      lunchReturnTime: at('2026-07-15', '13:00'),
      exitTime: at('2026-07-15', '16:00'),
    }, employee, rule, null);
    expect(result.totalWorkedMinutes).toBe(420);
    expect(result.dailyBalanceMinutes).toBe(-60);
    expect(result.lateMinutes).toBe(0);
    expect(result.earlyLeaveMinutes).toBe(60);
    expect(result.incidentType).toBe('saida_antecipada');
  });

  it('desconsidera variacoes de ate cinco minutos por marcacao e dez no dia', () => {
    const result = service.calculateTotals({
      workDate: at('2026-07-15', '00:00'),
      entryTime: at('2026-07-15', '08:05'),
      lunchStartTime: at('2026-07-15', '12:00'),
      lunchReturnTime: at('2026-07-15', '13:00'),
      exitTime: at('2026-07-15', '17:00'),
    }, employee, rule, null);
    expect(result.dailyBalanceMinutes).toBe(0);
    expect(result.overtime50Minutes).toBe(0);
    expect(result.lateMinutes).toBe(0);
  });

  it('conta integralmente atraso superior a cinco minutos', () => {
    const result = service.calculateTotals({
      workDate: at('2026-07-15', '00:00'),
      entryTime: at('2026-07-15', '08:06'),
      lunchStartTime: at('2026-07-15', '12:00'),
      lunchReturnTime: at('2026-07-15', '13:00'),
      exitTime: at('2026-07-15', '17:00'),
    }, employee, rule, null);
    expect(result.dailyBalanceMinutes).toBe(-6);
    expect(result.lateMinutes).toBe(6);
    expect(result.incidentType).toBe('atraso');
  });

  it('mantem atraso e hora extra como ocorrencias independentes', () => {
    const result = service.calculateTotals({
      workDate: at('2026-07-15', '00:00'),
      entryTime: at('2026-07-15', '09:00'),
      lunchStartTime: at('2026-07-15', '12:00'),
      lunchReturnTime: at('2026-07-15', '13:00'),
      exitTime: at('2026-07-15', '19:00'),
    }, employee, rule, null);
    expect(result.totalWorkedMinutes).toBe(540);
    expect(result.lateMinutes).toBe(60);
    expect(result.overtime50Minutes).toBe(120);
    expect(result.absenceMinutes).toBe(60);
    expect(result.dailyBalanceMinutes).toBe(60);
    expect(result.incidentType).toBe('atraso');
  });

  it('mantem entrada antecipada e saida antecipada como ocorrencias independentes', () => {
    const result = service.calculateTotals({
      workDate: at('2026-07-15', '00:00'),
      entryTime: at('2026-07-15', '07:00'),
      lunchStartTime: at('2026-07-15', '12:00'),
      lunchReturnTime: at('2026-07-15', '13:00'),
      exitTime: at('2026-07-15', '16:00'),
    }, employee, rule, null);
    expect(result.totalWorkedMinutes).toBe(480);
    expect(result.earlyLeaveMinutes).toBe(60);
    expect(result.overtime50Minutes).toBe(60);
    expect(result.absenceMinutes).toBe(60);
    expect(result.dailyBalanceMinutes).toBe(0);
    expect(result.incidentType).toBe('saida_antecipada');
  });

  it('classifica todo trabalho em descanso nao compensado como 100%', () => {
    const result = service.calculateTotals({
      workDate: at('2026-07-19', '00:00'),
      entryTime: at('2026-07-19', '08:00'),
      exitTime: at('2026-07-19', '12:00'),
    }, employee, rule, null);
    expect(result.overtime50Minutes).toBe(0);
    expect(result.overtime100Minutes).toBe(240);
  });

  it('converte sete horas civis noturnas em oito horas fictas', () => {
    const nightEmployee = { ...employee, dailyWorkload: '07:00', standardEntry: '22:00', standardExit: '05:00' };
    const result = service.calculateTotals({
      workDate: at('2026-07-15', '00:00'),
      entryTime: at('2026-07-15', '22:00'),
      exitTime: at('2026-07-16', '05:00'),
    }, nightEmployee, { ...rule, dailyMinutes: 420, breakMinutes: 0 }, null);
    expect(result.nightShiftMinutes).toBe(480);
  });
  it('aplica adicional noturno na prorrogacao apos as 5h quando a jornada cobre todo o periodo noturno', () => {
    const result = service.calculateTotals({
      workDate: at('2026-07-15', '00:00'),
      entryTime: at('2026-07-15', '22:00'),
      exitTime: at('2026-07-16', '07:00'),
    }, { ...employee, dailyWorkload: '09:00', standardEntry: '22:00', standardExit: '07:00' }, { ...rule, dailyMinutes: 540, breakMinutes: 0 }, null);
    expect(result.nightShiftMinutes).toBe(617);
  });
});
