import { tagKey } from './jobTagLabels';
export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => { const id = key(item); if (seen.has(id)) return false; seen.add(id); return true; });
}
const MODES: Record<string, string> = { remoto: 'Remoto', remote: 'Remoto', hibrido: 'Híbrido', hybrid: 'Híbrido', presencial: 'Presencial', onsite: 'Presencial', on_site: 'Presencial' };
const CONTRACTS: Record<string, string> = { pj: 'PJ', pessoa_juridica: 'PJ', contractor: 'PJ', clt: 'CLT', full_time: 'Tempo integral', part_time: 'Meio período', estagio: 'Estágio', internship: 'Estágio', temporario: 'Temporário', temporary: 'Temporário', aprendiz: 'Aprendiz', apprentice: 'Aprendiz' };
export function jobLocationLine(job: { location?: string | null; workMode?: string | null; employmentType?: string | null }) {
  const parts = (job.location ?? '').split(/[·|]/).map(part => part.trim()).filter(Boolean);
  const mode = MODES[tagKey(job.workMode ?? '')] || parts.map(part => MODES[tagKey(part)]).find(Boolean);
  const location = uniqueBy(parts.filter(part => !MODES[tagKey(part)] && !CONTRACTS[tagKey(part)]), tagKey).map(part => part.replace(/\s*\/\s*/g, '/')).join(' · ');
  const contract = CONTRACTS[tagKey(job.employmentType ?? '')];
  return uniqueBy([location, mode, contract].filter((value): value is string => Boolean(value)), tagKey).join(' · ') || 'Local não informado';
}
