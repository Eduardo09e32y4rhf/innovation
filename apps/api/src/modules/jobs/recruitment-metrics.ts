/** Métricas de recrutamento (cálculo puro). Diversidade só aparece agregada e em grupos de pelo menos MIN_GROUP pessoas. */
export const MIN_GROUP = 5;
export const KIND_ORDER = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'] as const;
export const KIND_LABEL: Record<string, string> = { APPLIED: 'Candidaturas', SCREENING: 'Triagem', INTERVIEW: 'Entrevistas', OFFER: 'Proposta', HIRED: 'Contratados' };

export interface MetricApp {
  id: string; jobId: string; createdAt: Date; status: string; source: string | null; rejectionCode: string | null;
  reachedKinds: string[]; hiredAt: Date | null; rejectedFromKind: string | null;
}
export interface MetricJob { id: string; title: string; createdAt: Date }
export interface MetricDiversity { gender: string | null; race: string | null; pcd: boolean | null }

const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;
export const average = (values: number[]) => (values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null);
export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2);
  return round1(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}
const days = (from: Date, to: Date) => Math.max(0, (to.getTime() - from.getTime()) / DAY);
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 1000) / 10 : null);

export function computeMetrics(input: { apps: MetricApp[]; jobs: MetricJob[]; diversity: MetricDiversity[] }) {
  const { apps, jobs } = input;
  const hired = apps.filter((app) => app.hiredAt);
  const timeToHire = hired.map((app) => days(app.createdAt, app.hiredAt as Date));

  const firstHireByJob = new Map<string, Date>();
  for (const app of hired) { const current = firstHireByJob.get(app.jobId); if (!current || (app.hiredAt as Date) < current) firstHireByJob.set(app.jobId, app.hiredAt as Date); }
  const timeToFill = jobs.filter((job) => firstHireByJob.has(job.id)).map((job) => days(job.createdAt, firstHireByJob.get(job.id) as Date));

  const reached = (kind: string) => apps.filter((app) => kind === 'APPLIED' || app.reachedKinds.includes(kind) || (kind === 'HIRED' && app.status === 'HIRED')).length;
  const funnel = KIND_ORDER.map((kind, index) => {
    const count = reached(kind);
    const previous = index === 0 ? null : reached(KIND_ORDER[index - 1]);
    return { kind, label: KIND_LABEL[kind], count, conversionFromPrevious: previous === null ? null : pct(count, previous) };
  });

  const withdrawals: Record<string, number> = {};
  for (const app of apps) if (app.status === 'REJECTED' && app.rejectionCode === 'DESISTENCIA') { const key = KIND_LABEL[app.rejectedFromKind ?? 'APPLIED'] ?? 'Candidaturas'; withdrawals[key] = (withdrawals[key] ?? 0) + 1; }

  const reasons: Record<string, number> = {};
  for (const app of apps) if (app.status === 'REJECTED') { const key = app.rejectionCode ?? 'SEM_CODIGO'; reasons[key] = (reasons[key] ?? 0) + 1; }

  const sources = new Map<string, { applications: number; hires: number }>();
  for (const app of apps) { const key = app.source ?? 'OUTRO'; const row = sources.get(key) ?? { applications: 0, hires: 0 }; row.applications++; if (app.status === 'HIRED') row.hires++; sources.set(key, row); }
  const bySource = [...sources.entries()].map(([source, row]) => ({ source, ...row, hireRate: pct(row.hires, row.applications) })).sort((a, b) => b.hires - a.hires || b.applications - a.applications);

  const offers = reached('OFFER');
  return {
    totals: { applications: apps.length, hired: hired.length, rejected: apps.filter((app) => app.status === 'REJECTED').length, open: apps.filter((app) => !['HIRED', 'REJECTED'].includes(app.status)).length },
    timeToHireDays: { average: average(timeToHire), median: median(timeToHire), samples: timeToHire.length },
    timeToFillDays: { average: average(timeToFill), median: median(timeToFill), samples: timeToFill.length },
    offerAcceptanceRate: pct(hired.length, offers),
    funnel, withdrawalsByStage: withdrawals, rejectionReasons: reasons, bySource,
    diversity: anonymizeDiversity(input.diversity),
  };
}

/** Grupos com menos de MIN_GROUP pessoas são omitidos para não identificar ninguém. */
export function anonymizeDiversity(rows: MetricDiversity[]) {
  const group = (values: Array<string | null>) => {
    const counts = new Map<string, number>();
    for (const value of values) if (value && value !== 'PREFIRO_NAO_INFORMAR') counts.set(value, (counts.get(value) ?? 0) + 1);
    return Object.fromEntries([...counts].filter(([, count]) => count >= MIN_GROUP));
  };
  const pcdYes = rows.filter((row) => row.pcd === true).length;
  return { responses: rows.length, minGroup: MIN_GROUP, gender: group(rows.map((row) => row.gender)), race: group(rows.map((row) => row.race)), pcd: pcdYes >= MIN_GROUP ? pcdYes : null };
}