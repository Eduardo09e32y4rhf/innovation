/** Regra compartilhada pela API e pela prévia do formulário. Não altera o checklist de candidatura. */
export type StrengthProfile = {
  name?: string | null; about?: string | null; phone?: string | null;
  city?: string | null; state?: string | null; street?: string | null;
  education?: unknown; experience?: unknown; skills?: unknown; languages?: unknown;
  resumeKey?: string | null; resume?: { name?: string | null } | null;
};
export type StrengthItem = { key: string; label: string; tip: string; points: number; done: boolean; anchor: string };
const has = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const rows = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
const strings = (value: unknown) => Array.isArray(value) && value.some(has);

export function candidateProfileStrength(profile: StrengthProfile) {
  const items: StrengthItem[] = [
    { key: 'identity', label: 'Foto ou iniciais', tip: 'Preencha seu nome para exibir suas iniciais.', points: 5, done: has(profile.name), anchor: 'dados' },
    { key: 'about', label: 'Resumo profissional', tip: 'Adicione seu resumo profissional (+20)', points: 20, done: has(profile.about), anchor: 'resumo' },
    { key: 'experience', label: 'Experiências', tip: 'Adicione uma experiência profissional.', points: 20, done: rows(profile.experience).some(item => has(item.role)), anchor: 'experiencia' },
    { key: 'education', label: 'Formação', tip: 'Informe sua formação.', points: 15, done: rows(profile.education).some(item => has(item.level)), anchor: 'formacao' },
    { key: 'skills', label: 'Competências', tip: 'Adicione suas competências.', points: 15, done: strings(profile.skills), anchor: 'competencias' },
    { key: 'languages', label: 'Idiomas', tip: 'Informe os idiomas que você conhece.', points: 10, done: strings(profile.languages), anchor: 'idiomas' },
    { key: 'resume', label: 'Currículo anexado', tip: 'Anexe seu currículo.', points: 10, done: has(profile.resumeKey) || Boolean(profile.resume), anchor: 'curriculo' },
    { key: 'contact', label: 'Contato e endereço', tip: 'Complete telefone e endereço.', points: 5, done: String(profile.phone ?? '').replace(/\D/g, '').length >= 10 && [profile.street, profile.city, profile.state].every(has), anchor: 'endereco' },
  ];
  const total = items.reduce((sum, item) => sum + (item.done ? item.points : 0), 0);
  const score = has(profile.about) ? total : Math.min(80, total);
  // O critério de aceite (85 e resumo) prevalece sobre a faixa conflitante de 70 na gamificação.
  const name = score >= 90 && has(profile.about) ? 'Destaque RH' : score >= 85 && has(profile.about) ? 'Avançado' : score >= 40 ? 'Intermediário' : 'Iniciante';
  const missingItems = items.filter(item => !item.done).sort((a, b) => b.points - a.points);
  return { score, level: { name, note: missingItems.length ? 'Complete os itens abaixo para fortalecer seu perfil.' : 'Perfil completo. Mantenha seus dados atualizados.' }, items, missingItems, next: missingItems };
}
