import { DEFAULT_SCHEDULES, defaultScheduleRows, ensureDefaultSchedules } from './default-schedules';

function fakeDb(existingNames: string[] = []) {
  const created: any[] = [];
  return {
    created,
    db: {
      schedule: {
        findMany: async () => existingNames.map((name) => ({ name })),
        createMany: async ({ data }: any) => { created.push(...data); return { count: data.length }; },
      },
    } as any,
  };
}

describe('escalas padrao da empresa', () => {
  it('traz 5x2, 6x1 e 12x36', () => {
    expect(DEFAULT_SCHEDULES.map((item) => item.scaleType)).toEqual(['5x2', '6x1', '12x36']);
  });

  it('5x2 folga sabado e domingo; 6x1 folga so domingo; 12x36 alterna a partir de hoje', () => {
    const [s52, s61, s1236] = defaultScheduleRows(DEFAULT_SCHEDULES, new Date('2026-10-06T15:00:00Z'));
    expect(s52.restDays).toEqual([0, 6]);
    expect(s61.restDays).toEqual([0]);
    expect(s61.workDays).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s1236).toMatchObject({ cycleWorkHours: 12, cycleRestHours: 36, entryTime: '07:00', exitTime: '19:00' });
    expect((s1236 as any).cycleStartDate.toISOString()).toBe('2026-10-06T00:00:00.000Z');
  });

  it('6x1 nao passa de 44h semanais', () => {
    const s61 = DEFAULT_SCHEDULES[1];
    const [h, m] = s61.exitTime.split(':').map(Number); const [eh, em] = s61.entryTime.split(':').map(Number);
    const dailyMinutes = (h * 60 + m) - (eh * 60 + em) - 60;
    expect((dailyMinutes * s61.workDays.length) / 60).toBeLessThanOrEqual(44);
  });

  it('cria todas numa empresa nova e nunca duplica ao repetir', async () => {
    const empty = fakeDb();
    expect(await ensureDefaultSchedules(empty.db, 'c1')).toBe(3);
    expect(empty.created.every((row) => row.companyId === 'c1')).toBe(true);
    const partial = fakeDb(['Escala 5x2']);
    expect(await ensureDefaultSchedules(partial.db, 'c1')).toBe(2);
    expect(partial.created.map((row) => row.name)).toEqual(['Escala 6x1', 'Escala 12x36']);
    const full = fakeDb(DEFAULT_SCHEDULES.map((item) => item.name));
    expect(await ensureDefaultSchedules(full.db, 'c1')).toBe(0);
    expect(full.created).toHaveLength(0);
  });
});
