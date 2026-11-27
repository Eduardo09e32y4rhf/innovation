export type MatchCandidate = {
  skills?: unknown; education?: unknown; experience?: unknown; languages?: unknown;
  driverLicenseCategory?: unknown; profession?: string | null; city?: string | null; state?: string | null;
};
type Criterion = { name: string; value?: string | null; kind?: string | null; isMandatory: boolean; weight?: number };
export type MatchJob = { title: string; department?: string | null; location?: string | null; workMode?: string | null; requirements?: string[]; criteria?: Criterion[] };
export const foldMatch = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const list = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map(foldMatch).filter(Boolean) : [];
const records = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
const tokens = (value: unknown) => foldMatch(value).split(/[^a-z0-9+#]+/).filter(word => word.length > 2 && !['com', 'para', 'das', 'dos', 'uma', 'experiencia', 'conhecimento', 'exigido'].includes(word));
const overlap = (a: unknown, b: unknown) => tokens(a).some(word => tokens(b).includes(word));
const educationLevel = (value: unknown) => {
  const text = foldMatch(value);
  if (/pos|mestr|doutor/.test(text)) return 4;
  if (/superior|gradu/.test(text)) return 3;
  if (/tecnic/.test(text)) return 2;
  if (/medio/.test(text)) return 1;
  return /fundamental/.test(text) ? 0 : -1;
};
const licenseSet = (value: unknown) => {
  const values = Array.isArray(value) ? value : [value];
  const categories = values.flatMap(item => foldMatch(item).toUpperCase().split(/[\s,;:/|()-]+/).filter(part => /^[A-E]{1,2}$/.test(part)));
  return new Set(categories.flatMap(part => [...part]));
};
const area = (value: unknown) => {
  const text = foldMatch(value);
  if (/desenvolv|full.?stack|front.?end|back.?end|software|programa|engenharia de dados/.test(text)) return 'tecnologia';
  if (/vend|comercial|atendimento/.test(text)) return 'vendas';
  return tokens(text).join(' ');
};

/** Pesos fixos: obrigatórios 50, competências 25, cargo 15, localização 10. Sem evidência não há pontos. */
export function calculateMatch(candidate: MatchCandidate, job: MatchJob) {
  const skills = list(candidate.skills);
  const source = job.criteria?.length ? job.criteria : (job.requirements ?? []).map(name => ({ name, value: name, kind: /\bcnh\b/i.test(name) ? 'CNH' : educationLevel(name) >= 0 ? 'EDUCATION' : 'SKILL', isMandatory: true, weight: 1 }));
  const requirements = source.filter(item => item.name.trim()).map(item => {
    const target = foldMatch(item.value || item.name).replace(/^(pede|cargo)[_ :]+/, '').replace(/_/g, ' ');
    const kind = String(item.kind || 'SKILL').toUpperCase();
    let met = false;
    if (kind === 'CNH' || kind === 'LICENSE') {
      const held = licenseSet(candidate.driverLicenseCategory);
      met = [...licenseSet(target)].some(category => held.has(category));
    } else if (kind === 'EDUCATION') {
      met = educationLevel(target) >= 0 && records(candidate.education).some(row => foldMatch(row.status) !== 'incompleto' && educationLevel(row.level) >= educationLevel(target));
    } else if (kind === 'EXPERIENCE') {
      met = records(candidate.experience).some(row => overlap(row.role, target));
    } else {
      met = [...skills, ...list(candidate.languages)].some(skill => skill === target || (tokens(target).length > 0 && tokens(target).every(word => tokens(skill).includes(word))));
    }
    return { label: item.name, must: item.isMandatory, met, kind, weight: Math.max(1, item.weight || 1) };
  });
  const ratio = (items: typeof requirements) => items.length ? items.reduce((sum, item) => sum + (item.met ? item.weight : 0), 0) / items.reduce((sum, item) => sum + item.weight, 0) : 0;
  const mandatory = requirements.filter(item => item.must);
  const skillRequirements = requirements.filter(item => !['CNH', 'LICENSE', 'EDUCATION', 'EXPERIENCE'].includes(item.kind));
  const roles = [candidate.profession, ...records(candidate.experience).map(item => item.role)].filter(Boolean);
  const roleMatch = roles.some(role => overlap(role, job.title));
  const sameLocation = Boolean(candidate.city) && foldMatch(job.location).split(/[·|]/).some(part => foldMatch(part).split('/')[0] === foldMatch(candidate.city)) && (!candidate.state || !/\/[a-z]{2}\b/i.test(job.location ?? '') || foldMatch(job.location).includes(`/${foldMatch(candidate.state)}`));
  const remote = /^(remote|remoto)$/i.test(job.workMode ?? '');
  const hasProfile = skills.length > 0 || roles.length > 0 || records(candidate.education).length > 0;
  const mandatoryScore = mandatory.length ? ratio(mandatory) * 50 : (hasProfile ? 50 : 0);
  const raw = Math.round(mandatoryScore + ratio(skillRequirements) * 25 + (roleMatch ? 15 : 0) + (hasProfile && (remote || sameLocation) ? 10 : 0));
  const differentArea = roles.length > 0 && !roles.some(role => area(role) === area(job.department || job.title) || overlap(role, job.title));
  const sharedSkill = skillRequirements.some(item => item.met) || skills.some(skill => overlap(skill, job.title));
  const missingMandatory = mandatory.some(item => !item.met);
  const score = Math.min(raw, missingMandatory ? 60 : 100, differentArea && !sharedSkill ? 40 : 100, hasProfile ? 100 : 0);
  const met = requirements.filter(item => item.met).map(item => item.label);
  const missing = requirements.filter(item => !item.met).map(item => item.label);
  const partial: string[] = [];
  if (roleMatch) met.push('Experiência ou cargo compatível'); else missing.push('Experiência ou cargo compatível');
  if (hasProfile && (remote || sameLocation)) met.push(remote ? 'Modalidade remota' : 'Localização compatível'); else missing.push('Localização compatível');
  if (!requirements.length) partial.push('A vaga não informa requisitos suficientes para uma avaliação completa.');
  if (differentArea && !sharedSkill) partial.push('Área diferente e nenhuma competência em comum identificada.');
  return { score, met: [...new Set(met)], missing: [...new Set(missing)], partial, hasProfile, missingMandatory,
    level: !missingMandatory && score >= 85 ? 'ideal' as const : score >= 40 ? 'warn' as const : 'bad' as const,
    requirements: requirements.map(({ label, must, met }) => ({ label, must, met })) };
}
