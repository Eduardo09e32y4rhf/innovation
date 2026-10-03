import { describe, expect, it, vi } from 'vitest';
import { DayResolver, parseDateOnly, scheduledMinutes } from './day-resolver';

const schedule = {
  id: 's1', name: 'Comercial', scaleType: '5x2', entryTime: '08:00', lunchStartTime: '12:00', lunchReturnTime: '13:00', exitTime: '17:00',
  workDays: [1, 2, 3, 4, 5], restDays: [0, 6], cycleStartDate: null,
};

function resolverWith(extra: { exceptions?: any[]; holidays?: any[]; vacations?: any[]; schedule?: any } = {}) {
  const prisma = {
    userSchedule: { findMany: vi.fn().mockResolvedValue([{ employeeId: 'e1', startDate: parseDateOnly('2026-01-01'), endDate: null, schedule: extra.schedule ?? schedule }]) },
    scheduleException: { findMany: vi.fn().mockResolvedValue(extra.exceptions ?? []) },
    holiday: { findMany: vi.fn().mockResolvedValue(extra.holidays ?? []) },
    vacation: { findMany: vi.fn().mockResolvedValue(extra.vacations ?? []) },
  } as any;
  return new DayResolver(prisma);
}

describe('DayResolver (fonte única da escala)', () => {
  it('resolve dias úteis e fins de semana pela escala atribuída (datas são UTC date-only)', async () => {
    const days = await resolverWith().resolveRange('c', 'e1', parseDateOnly('2026-03-02'), parseDateOnly('2026-03-08'));
    expect(days.map((day) => day.type)).toEqual(['TRABALHO', 'TRABALHO', 'TRABALHO', 'TRABALHO', 'TRABALHO', 'FOLGA', 'FOLGA']);
    expect(days[0]).toMatchObject({ date: '2026-03-02', dayOfWeek: 1, working: true, entry: '08:00', exit: '17:00' });
    expect(scheduledMinutes(days[0])).toBe(480);
  });

  it('troca de folga: FOLGA numa quarta e COMPENSACAO num sábado trabalhado', async () => {
    const days = await resolverWith({
      exceptions: [
        { employeeId: 'e1', date: parseDateOnly('2026-03-04'), exceptionType: 'FOLGA', reason: 'troca' },
        { employeeId: 'e1', date: parseDateOnly('2026-03-07'), exceptionType: 'COMPENSACAO', altEntryTime: '09:00', altExitTime: '18:00' },
      ],
    }).resolveRange('c', 'e1', parseDateOnly('2026-03-02'), parseDateOnly('2026-03-08'));
    expect(days[2]).toMatchObject({ date: '2026-03-04', type: 'FOLGA', working: false, entry: null });
    expect(days[5]).toMatchObject({ date: '2026-03-07', type: 'COMPENSACAO', working: true, entry: '09:00', exit: '18:00' });
  });

  it('feriado e férias removem o dia esperado', async () => {
    const days = await resolverWith({
      holidays: [{ date: parseDateOnly('2026-03-03'), name: 'Feriado local' }],
      vacations: [{ employeeId: 'e1', startDate: parseDateOnly('2026-03-05'), endDate: parseDateOnly('2026-03-06') }],
    }).resolveRange('c', 'e1', parseDateOnly('2026-03-02'), parseDateOnly('2026-03-06'));
    expect(days[1]).toMatchObject({ type: 'FERIADO', working: false, holidayName: 'Feriado local' });
    expect(days[3]).toMatchObject({ type: 'FERIAS', working: false });
    expect(days[4]).toMatchObject({ type: 'FERIAS', working: false });
  });

  it('12x36 alterna trabalho e folga a partir do início do ciclo', async () => {
    const days = await resolverWith({ schedule: { ...schedule, scaleType: '12x36', workDays: [0, 1, 2, 3, 4, 5, 6], restDays: [], cycleStartDate: parseDateOnly('2026-03-02') } })
      .resolveRange('c', 'e1', parseDateOnly('2026-03-02'), parseDateOnly('2026-03-05'));
    expect(days.map((day) => day.type)).toEqual(['TRABALHO', 'FOLGA', 'TRABALHO', 'FOLGA']);
  });

  it('sem escala atribuída o dia é SEM_ESCALA', async () => {
    const prisma = { userSchedule: { findMany: vi.fn().mockResolvedValue([]) }, scheduleException: { findMany: vi.fn().mockResolvedValue([]) }, holiday: { findMany: vi.fn().mockResolvedValue([]) }, vacation: { findMany: vi.fn().mockResolvedValue([]) } } as any;
    const day = await new DayResolver(prisma).resolveDay('c', 'e1', parseDateOnly('2026-03-02'));
    expect(day).toMatchObject({ type: 'SEM_ESCALA', working: false });
  });
});
