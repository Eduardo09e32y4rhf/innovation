import type { CandidateProfile } from './candidate-api';
import type { PublicJob } from './public-jobs';

/** Força do perfil (0–100): vai além do mínimo obrigatório e mostra o que mais aumenta a chance de ser chamado. */
export type StrengthItem = { key: string; label: string; tip: string; points: number; done: boolean; anchor: string };

const has = (value: unknown) => String(value ?? '').trim().length > 0;

export function profileStrength(profile: CandidateProfile) {
  const education = profile.education ?? [];
  const experience = profile.experience ?? [];
  const items: StrengthItem[] = [
    { key: 'profession', label: 'Título profissional', tip: 'Diga o que você faz (ex.: Analista contábil). É a primeira coisa que o RH lê.', points: 10, done: has(profile.profession), anchor: 'resumo' },
    { key: 'about', label: 'Resumo sobre você', tip: 'Escreva 2 ou 3 frases sobre sua trajetória e o que busca.', points: 10, done: (profile.about ?? '').trim().length >= 40, anchor: 'resumo' },
    { key: 'experience', label: 'Experiência profissional', tip: 'Adicione seu último emprego com cargo, empresa e período.', points: 15, done: experience.length > 0, anchor: 'experiencia' },
    { key: 'experienceDetail', label: 'Atividades na experiência', tip: 'Descreva o que você fazia: perfis com atividades recebem mais convites.', points: 5, done: experience.some((item) => item.description.trim().length >= 30), anchor: 'experiencia' },
    { key: 'education', label: 'Formação', tip: 'Informe escola, faculdade ou curso técnico.', points: 10, done: education.length > 0, anchor: 'formacao' },
    { key: 'educationDetail', label: 'Curso e instituição', tip: 'Coloque o nome do curso e da escola/faculdade.', points: 5, done: education.some((item) => has(item.course) && has(item.school)), anchor: 'formacao' },
    { key: 'skills', label: '3 ou mais competências', tip: 'Liste ferramentas e conhecimentos (Excel, atendimento, SPED…). Usamos isso para achar vagas para você.', points: 10, done: (profile.skills ?? []).length >= 3, anchor: 'competencias' },
    { key: 'resume', label: 'Currículo anexado', tip: 'Anexe seu currículo em PDF ou DOCX.', points: 10, done: Boolean(profile.resume?.name), anchor: 'curriculo' },
    { key: 'contact', label: 'Nome, CPF e telefone', tip: 'Necessários para se candidatar com um clique.', points: 10, done: has(profile.name) && has(profile.cpf) && (profile.phone ?? '').replace(/\D/g, '').length >= 10, anchor: 'dados' },
    { key: 'address', label: 'Endereço', tip: 'Com sua cidade mostramos vagas perto de você.', points: 10, done: [profile.cep, profile.street, profile.streetNumber, profile.neighborhood, profile.city, profile.state].every(has), anchor: 'endereco' },
    { key: 'birthDate', label: 'Data de nascimento', tip: 'Algumas vagas (estágio, aprendiz) dependem da idade.', points: 5, done: has(profile.birthDate), anchor: 'dados' },
  ];
  const score = items.reduce((sum, item) => sum + (item.done ? item.points : 0), 0);
  const level = score >= 90 ? { name: 'Destaque', note: 'Seu perfil está entre os mais completos. Continue atualizando!' }
    : score >= 70 ? { name: 'Avançado', note: 'Falta pouco para seu perfil virar destaque para o RH.' }
    : score >= 40 ? { name: 'Intermediário', note: 'Bom começo! Complete os próximos itens para aparecer em mais vagas.' }
    : { name: 'Iniciante', note: 'Complete seu perfil: perfis completos são chamados muito mais vezes.' };
  const next = items.filter((item) => !item.done).sort((a, b) => b.points - a.points);
  return { score, level, items, next };
}

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por', 'a', 'o', 'as', 'os', 'ensino', 'medio', 'superior', 'tecnico', 'curso', 'completo', 'nivel']);
export const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = (text: string) => fold(text).split(/[^a-z0-9+#]+/).filter((word) => word.length >= 3 && !STOP.has(word));

/** Palavras do perfil usadas para recomendar vagas. */
export function profileKeywords(profile: CandidateProfile): string[] {
  const parts = [profile.profession ?? '', ...(profile.skills ?? []), ...(profile.experience ?? []).map((item) => item.role), ...(profile.education ?? []).map((item) => item.course)];
  return Array.from(new Set(parts.flatMap(words)));
}

export type JobMatch = { job: PublicJob; percent: number; reasons: string[] };

/** Ordena as vagas abertas pelo quanto combinam com o perfil (título pesa mais que descrição; cidade soma). */
export function matchJobs(profile: CandidateProfile, jobs: PublicJob[], limit = 6): JobMatch[] {
  const keywords = profileKeywords(profile);
  const city = fold(profile.city ?? '');
  const scored = jobs.map((job) => {
    const title = new Set(words(job.title));
    const body = new Set(words([job.description, ...job.requirements, job.department ?? ''].join(' ')));
    const titleHits = keywords.filter((word) => title.has(word));
    const bodyHits = keywords.filter((word) => !title.has(word) && body.has(word));
    const sameCity = Boolean(city) && fold(job.location ?? '').includes(city);
    const remote = /remot/.test(fold(job.workMode ?? ''));
    const raw = titleHits.length * 30 + bodyHits.length * 12 + (sameCity ? 15 : 0) + (remote ? 5 : 0);
    const reasons = [
      ...titleHits.slice(0, 2).map((word) => `cargo: ${word}`),
      ...bodyHits.slice(0, 2).map((word) => `pede ${word}`),
      ...(sameCity ? ['na sua cidade'] : []),
      ...(remote ? ['remoto'] : []),
    ];
    return { job, raw, reasons };
  });
  return scored
    .filter((item) => !keywords.length || item.raw > 0)
    .sort((a, b) => b.raw - a.raw || String(b.job.createdAt ?? '').localeCompare(String(a.job.createdAt ?? '')))
    .slice(0, limit)
    .map(({ job, raw, reasons }) => ({ job, percent: keywords.length ? Math.min(98, 40 + raw) : 0, reasons }));
}

export function monthLabel(value: string | null) {
  if (!value) return '';
  const [year, month] = value.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
}
