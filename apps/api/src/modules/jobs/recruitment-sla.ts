/** SLA por etapa do funil (calculo puro): tempo gasto em cada etapa, quem esta parado alem do prazo agora. */
export interface SlaStage { name: string; kind: string; slaDays: number | null }
export interface SlaEvent { type: string; fromStage: string | null; toStage: string | null; createdAt: Date }
export interface SlaApp { id: string; jobId: string; jobTitle: string; createdAt: Date; status: string; currentStage: string | null; stageMovedAt: Date | null; events: SlaEvent[] }

const DAY = 86_400_000;
const TERMINAL = new Set(['HIRED', 'REJECTED']);
const round1 = (n: number) => Math.round(n * 10) / 10;
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2);
  return round1(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
};

/** Trechos de permanencia de uma candidatura: [etapa, dias, aberto?]. Parte da etapa inicial (fromStage do primeiro evento) e segue os eventos. */
export function stageSegments(app: SlaApp, now: Date): Array<{ stage: string; days: number; open: boolean }> {
  const moves = app.events.filter((event) => ['STAGE_CHANGED', 'REJECTED'].includes(event.type) && event.toStage).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const segments: Array<{ stage: string; days: number; open: boolean }> = [];
  let stage = moves[0]?.fromStage ?? app.currentStage;
  let since = app.createdAt;
  for (const move of moves) {
    if (stage) segments.push({ stage, days: Math.max(0, (move.createdAt.getTime() - since.getTime()) / DAY), open: false });
    stage = move.toStage;
    since = move.createdAt;
  }
  if (stage && !TERMINAL.has(app.status)) segments.push({ stage, days: Math.max(0, (now.getTime() - (moves.length ? since : app.stageMovedAt ?? app.createdAt).getTime()) / DAY), open: true });
  return segments;
}

export function computeStageSla(stages: SlaStage[], apps: SlaApp[], now: Date) {
  const track = stages.filter((stage) => !TERMINAL.has(stage.kind));
  const bucket = new Map<string, { days: number[]; stalled: number; current: number; over: number }>();
  for (const stage of track) bucket.set(stage.name, { days: [], stalled: 0, current: 0, over: 0 });
  const sla = new Map(track.map((stage) => [stage.name, stage.slaDays]));
  const stalledList: Array<{ applicationId: string; jobId: string; jobTitle: string; stage: string; days: number; slaDays: number }> = [];

  for (const app of apps) {
    for (const segment of stageSegments(app, now)) {
      const entry = bucket.get(segment.stage);
      if (!entry) continue;
      entry.days.push(segment.days);
      const limit = sla.get(segment.stage) ?? null;
      if (limit !== null && segment.days > limit) entry.over++;
      if (segment.open) {
        entry.current++;
        if (limit !== null && segment.days > limit) { entry.stalled++; stalledList.push({ applicationId: app.id, jobId: app.jobId, jobTitle: app.jobTitle, stage: segment.stage, days: Math.floor(segment.days), slaDays: limit }); }
      }
    }
  }
  return {
    stages: track.map((stage) => {
      const entry = bucket.get(stage.name)!;
      const avg = entry.days.length ? round1(entry.days.reduce((a, b) => a + b, 0) / entry.days.length) : null;
      return { name: stage.name, kind: stage.kind, slaDays: stage.slaDays, samples: entry.days.length, averageDays: avg, medianDays: median(entry.days), overSla: entry.over, stalled: entry.stalled, currentCount: entry.current };
    }),
    stalled: stalledList.sort((a, b) => b.days - a.days).slice(0, 20),
  };
}
