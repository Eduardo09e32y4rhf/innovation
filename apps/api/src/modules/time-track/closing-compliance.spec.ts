import { describe, expect, it } from 'vitest';
import { analyzeTimesheet, breakDeficitMinutes, requiredBreakMinutes, salaryDeadline, weeksLosingRest, type TrackLike } from './closing-compliance';

// Horários em UTC: São Paulo é UTC-3, então 08:00 local = 11:00Z.
const at = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00.000Z`);
const track = (day: string, entry?: string, lunchStart?: string, lunchReturn?: string, exit?: string, extra: Partial<TrackLike> = {}): TrackLike => ({
  date: new Date(`${day}T00:00:00.000Z`),
  entry: entry ? at(day, entry) : null, lunchStart: lunchStart ? at(day, lunchStart) : null, lunchReturn: lunchReturn ? at(day, lunchReturn) : null, exit: exit ? at(day, exit) : null,
  ...extra,
});
const period = { periodStart: new Date('2020-03-01T00:00:00Z'), periodEnd: new Date('2020-03-31T00:00:00Z') };
const codes = (tracks: TrackLike[], absences: string[] = []) => analyzeTimesheet({ tracks, unjustifiedAbsenceDates: absences, ...period }).issues.map((issue) => issue.code);

describe('intervalo intrajornada (art. 71)', () => {
  it('exige 1h acima de 6h e 15 min entre 4h e 6h', () => {
    expect(requiredBreakMinutes(9 * 60)).toBe(60);
    expect(requiredBreakMinutes(5 * 60)).toBe(15);
    expect(requiredBreakMinutes(4 * 60)).toBe(0);
  });
  it('calcula o tempo faltante do intervalo marcado', () => {
    expect(breakDeficitMinutes(track('2020-03-02', '11:00', '15:00', '15:30', '20:00'))).toBe(30);
    expect(breakDeficitMinutes(track('2020-03-02', '11:00', '15:00', '16:00', '21:00'))).toBe(0);
  });
  it('sem marcação do intervalo vira aviso, não pagamento', () => {
    const t = track('2020-03-02', '11:00', undefined, undefined, '21:00');
    expect(breakDeficitMinutes(t)).toBe(0);
    expect(codes([t])).toContain('BREAK_MISSING');
  });
});

describe('conferência do espelho', () => {
  it('bloqueia marcação ímpar e ajuste sem ciência do gestor', () => {
    const issues = analyzeTimesheet({ tracks: [track('2020-03-02', '11:00', '15:00', undefined, undefined), track('2020-03-03', '11:00', '15:00', '16:00', '21:00', { manualStatus: 'pending' })], unjustifiedAbsenceDates: [], ...period }).issues;
    expect(issues.filter((i) => i.severity === 'BLOCK').map((i) => i.code).sort()).toEqual(['ADJUST_PENDING', 'PUNCH_INCOMPLETE']);
  });
  it('avisa hora extra acima de 2h e sem aprovação', () => {
    const found = codes([track('2020-03-02', '11:00', '15:00', '16:00', '23:00', { overtime50Minutes: 150, overtimeApprovalStatus: 'PENDING' })]);
    expect(found).toEqual(expect.arrayContaining(['OVERTIME_OVER_LIMIT', 'OVERTIME_NOT_APPROVED']));
  });
  it('detecta interjornada menor que 11h', () => {
    // sai 23:00 local (02:00Z do dia seguinte) e volta 07:00 local: 8h
    const a = { ...track('2020-03-02', '11:00', '15:00', '16:00'), exit: new Date('2020-03-03T02:00:00.000Z') };
    const b = track('2020-03-03', '10:00', '15:00', '16:00', '19:00');
    expect(codes([a, b])).toContain('REST_BETWEEN_SHIFTS');
    expect(codes([track('2020-03-02', '11:00', '15:00', '16:00', '21:00'), track('2020-03-03', '11:00', '15:00', '16:00', '21:00')])).not.toContain('REST_BETWEEN_SHIFTS');
  });
  it('alerta ponto britânico (Súmula 338) só com horários sempre idênticos', () => {
    const days = Array.from({ length: 10 }, (_, i) => track(`2020-03-${String(i + 2).padStart(2, '0')}`, '11:00', '15:00', '16:00', '21:00'));
    expect(codes(days)).toContain('BRITISH_PUNCH');
    days[3] = track('2020-03-05', '11:07', '15:00', '16:00', '21:02');
    expect(codes(days)).not.toContain('BRITISH_PUNCH');
  });
});

describe('DSR e faltas', () => {
  it('perde o DSR da semana completa com falta injustificada', () => {
    const weeks = weeksLosingRest(['2020-03-11', '2020-03-12'], period.periodStart, period.periodEnd);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekStart).toBe('2020-03-09');
  });
  it('semana cortada pelo período não perde DSR neste fechamento', () => {
    expect(weeksLosingRest(['2020-03-02'], new Date('2020-03-04T00:00:00Z'), period.periodEnd)).toHaveLength(0);
  });
});

describe('prazo de pagamento (art. 459 §1º)', () => {
  it('5º dia útil do mês, contando sábado e pulando domingo e feriado', () => {
    // abril/2020 começa na quarta: qua 1, qui 2, sex 3, sáb 4, seg 6 -> 5º = 6
    expect(salaryDeadline(2020, 4).toISOString().slice(0, 10)).toBe('2020-04-06');
    expect(salaryDeadline(2020, 4, new Set(['2020-04-03'])).toISOString().slice(0, 10)).toBe('2020-04-07');
  });
});
