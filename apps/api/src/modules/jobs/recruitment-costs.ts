/** Custo de recrutamento (calculo puro): custo fixo da vaga + custo por origem (anuncio, agencia), por vaga, por origem e por contratacao. */
export interface CostJob { id: string; title: string; costAmount: number | null; sourceCosts: Array<{ source: string; amount: number }> }
export interface CostApp { jobId: string; source: string | null; status: string }

const money = (value: number) => Math.round(value * 100) / 100;
const perUnit = (cost: number, units: number) => (units > 0 ? money(cost / units) : null);

export function computeCosts(jobs: CostJob[], apps: CostApp[]) {
  const byJob = jobs.map((job) => {
    const mine = apps.filter((app) => app.jobId === job.id);
    const cost = money((job.costAmount ?? 0) + job.sourceCosts.reduce((sum, row) => sum + row.amount, 0));
    const hires = mine.filter((app) => app.status === 'HIRED').length;
    return { jobId: job.id, title: job.title, cost, applications: mine.length, hires, costPerHire: hires ? money(cost / hires) : null };
  }).filter((row) => row.cost > 0 || row.hires > 0).sort((a, b) => b.cost - a.cost);

  const costBySource = new Map<string, number>();
  for (const job of jobs) for (const row of job.sourceCosts) costBySource.set(row.source, money((costBySource.get(row.source) ?? 0) + row.amount));
  const jobIds = new Set(jobs.map((job) => job.id));
  const scoped = apps.filter((app) => jobIds.has(app.jobId));
  const sources = new Set<string>([...costBySource.keys(), ...scoped.map((app) => app.source ?? 'OUTRO')]);
  const bySource = [...sources].map((source) => {
    const mine = scoped.filter((app) => (app.source ?? 'OUTRO') === source);
    const cost = costBySource.get(source) ?? 0;
    const hires = mine.filter((app) => app.status === 'HIRED').length;
    return { source, cost, applications: mine.length, hires, costPerApplication: perUnit(cost, mine.length), costPerHire: hires ? perUnit(cost, hires) : null };
  }).filter((row) => row.cost > 0).sort((a, b) => b.cost - a.cost);

  const fixedTotal = money(jobs.reduce((sum, job) => sum + (job.costAmount ?? 0), 0));
  const sourceTotal = money([...costBySource.values()].reduce((sum, value) => sum + value, 0));
  const total = money(fixedTotal + sourceTotal);
  const hires = scoped.filter((app) => app.status === 'HIRED').length;
  return { total, fixedTotal, sourceTotal, hires, costPerHire: hires ? money(total / hires) : null, byJob, bySource };
}

/** Taxa de no-show das entrevistas. So existe quando o registro da entrevista traz `noShow` (cadastro de entrevistas); antes disso `available=false`. */
export function noShowRate(interviews: Array<{ noShow?: boolean | null }>) {
  const known = interviews.filter((row) => typeof row.noShow === 'boolean');
  if (!known.length) return { available: false, rate: null as number | null, interviews: 0, noShows: 0 };
  const noShows = known.filter((row) => row.noShow === true).length;
  return { available: true, rate: Math.round((noShows / known.length) * 1000) / 10, interviews: known.length, noShows };
}
