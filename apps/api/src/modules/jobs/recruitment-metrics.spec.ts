import { describe, expect, it } from 'vitest';
import { anonymizeDiversity, computeMetrics, median, type MetricApp } from './recruitment-metrics';

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const app = (over: Partial<MetricApp>): MetricApp => ({ id: 'a', jobId: 'j1', createdAt: d('2026-01-01'), status: 'APPLIED', source: 'LINKEDIN', rejectionCode: null, reachedKinds: [], hiredAt: null, rejectedFromKind: null, ...over });

describe('métricas de recrutamento', () => {
  it('calcula tempo para contratar, tempo para preencher e aceite de proposta', () => {
    const apps = [
      app({ id: '1', status: 'HIRED', hiredAt: d('2026-01-11'), reachedKinds: ['SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'] }),
      app({ id: '2', status: 'HIRED', hiredAt: d('2026-01-21'), reachedKinds: ['SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'] }),
      app({ id: '3', status: 'REJECTED', rejectionCode: 'SALARIO', reachedKinds: ['SCREENING', 'INTERVIEW', 'OFFER'] }),
    ];
    const m = computeMetrics({ apps, jobs: [{ id: 'j1', title: 'Dev', createdAt: d('2025-12-22') }], diversity: [] });
    expect(m.timeToHireDays).toEqual({ average: 15, median: 15, samples: 2 });
    expect(m.timeToFillDays.average).toBe(20);
    expect(m.offerAcceptanceRate).toBeCloseTo(66.7, 1);
    expect(m.funnel.map((f) => f.count)).toEqual([3, 3, 3, 3, 2]);
    expect(m.rejectionReasons).toEqual({ SALARIO: 1 });
  });
  it('conta desistência pela etapa de onde saiu e agrupa por origem', () => {
    const m = computeMetrics({ apps: [app({ status: 'REJECTED', rejectionCode: 'DESISTENCIA', rejectedFromKind: 'INTERVIEW' }), app({ id: 'b', source: 'WHATSAPP' })], jobs: [], diversity: [] });
    expect(m.withdrawalsByStage).toEqual({ Entrevistas: 1 });
    expect(m.bySource.map((s) => s.source).sort()).toEqual(['LINKEDIN', 'WHATSAPP']);
  });
  it('mediana de lista par e vazia', () => { expect(median([1, 3])).toBe(2); expect(median([])).toBeNull(); });
});

describe('diversidade anônima', () => {
  it('omite grupos com menos de 5 pessoas', () => {
    const rows = [...Array(5).fill({ gender: 'MULHER', race: null, pcd: null }), { gender: 'HOMEM', race: null, pcd: true }];
    const out = anonymizeDiversity(rows);
    expect(out.gender).toEqual({ MULHER: 5 });
    expect(out.pcd).toBeNull();
  });
});