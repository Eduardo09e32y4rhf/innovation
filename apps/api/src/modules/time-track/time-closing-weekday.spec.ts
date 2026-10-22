import { vi } from 'vitest';
import { PayrollCalculationService } from './payroll-calculation.service';
import { TimeClosingService } from './time-closing.service';
import { saoPauloDayOfWeek } from '../../common/utils/date.utils';

/**
 * As datas do periodo sao dias de calendario gravados em 00:00 UTC. Em Sao Paulo (UTC-3) esse instante cai as 21h do dia
 * anterior, entao o dia da semana nao pode ser lido pelo fuso: sabado virava sexta (falta indevida) e segunda virava domingo.
 */
function servico(tracks: any[], holidays: any[] = []) {
  const prisma: any = {
    employee: { findMany: vi.fn().mockResolvedValue([{ id: 'e1', name: 'Ana', position: 'Analista' }]) },
    timeTrack: { findMany: vi.fn().mockResolvedValue(tracks) },
    timeOccurrence: { findMany: vi.fn().mockResolvedValue([]) },
    holiday: { findMany: vi.fn().mockResolvedValue(holidays) },
  };
  return new TimeClosingService(prisma, new PayrollCalculationService());
}

function trilha(date: Date) {
  const d = date.toISOString().slice(0, 10);
  return {
    employeeId: 'e1', date,
    entry: new Date(`${d}T11:00:00.000Z`), lunchStart: new Date(`${d}T15:00:00.000Z`),
    lunchReturn: new Date(`${d}T16:00:00.000Z`), exit: new Date(`${d}T20:00:00.000Z`),
    totalWorked: 480, dailyBalance: 0, incidentType: null,
  };
}

describe('TimeClosingService: dia da semana no fechamento', () => {
  it('saoPauloDayOfWeek le o instante, nao o dia de calendario (por isso nao serve para datas 00:00 UTC)', () => {
    expect(saoPauloDayOfWeek(new Date('2026-10-05T00:00:00.000Z'))).toBe(0); // segunda 00:00Z = domingo 21h em SP
  });

  it('conferencia: mes todo com ponto de segunda a sexta nao gera falta em fim de semana', async () => {
    const dias: Date[] = [];
    for (let d = 1; d <= 30; d++) {
      const date = new Date(Date.UTC(2026, 8, d)); // setembro/2026 (passado)
      if (![0, 6].includes(date.getUTCDay())) dias.push(date);
    }
    const result: any = await servico(dias.map(trilha)).conference('c1', '2026-09');
    const faltas = (result.employees as any[]).flatMap((e) => e.issues).filter((i: any) => i.code === 'ABSENCE_UNJUSTIFIED').map((i: any) => i.date);
    expect(faltas).toEqual([]);
  });

  it('propriedade: 33 meses (jan/2024 a set/2026, com ano bissexto e viradas de ano), ponto de seg a sex = zero falta', async () => {
    let dias = 0;
    for (let i = 0; i < 33; i++) {
      const year = 2024 + Math.floor(i / 12);
      const month = i % 12;
      const tracks: any[] = [];
      for (let d = 1; d <= new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); d++) {
        const date = new Date(Date.UTC(year, month, d));
        if (![0, 6].includes(date.getUTCDay())) tracks.push(trilha(date));
        dias++;
      }
      const mes = `${year}-${String(month + 1).padStart(2, '0')}`;
      const result: any = await servico(tracks).conference('c1', mes);
      const faltas = (result.employees as any[]).flatMap((e) => e.issues).filter((x: any) => x.code === 'ABSENCE_UNJUSTIFIED');
      expect(faltas, mes).toEqual([]);
    }
    expect(dias).toBeGreaterThan(1000);
  });

  it('conferencia: falta de verdade numa segunda-feira e apontada, e sabado/domingo nunca', async () => {
    const dias: Date[] = [];
    for (let d = 1; d <= 30; d++) {
      const date = new Date(Date.UTC(2026, 8, d));
      if (![0, 6].includes(date.getUTCDay()) && d !== 7) dias.push(date); // 07/09/2026 e segunda-feira (feriado nacional, mas sem feriado cadastrado aqui)
    }
    const result: any = await servico(dias.map(trilha)).conference('c1', '2026-09');
    const faltas = (result.employees as any[]).flatMap((e) => e.issues).filter((i: any) => i.code === 'ABSENCE_UNJUSTIFIED').map((i: any) => i.date);
    expect(faltas).toEqual(['2026-09-07']); // a falta cai exatamente na segunda-feira, e nao no dia anterior
  });
});
