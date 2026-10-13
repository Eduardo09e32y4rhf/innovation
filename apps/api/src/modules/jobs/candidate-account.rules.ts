import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/** Regras puras da Área do candidato (sem banco), para testar sem mock. */

export const EDUCATION_LEVELS = ['Ensino fundamental', 'Ensino médio', 'Técnico', 'Superior', 'Pós-graduação'] as const;
export const EDUCATION_STATUS = ['Completo', 'Cursando', 'Incompleto'] as const;
export const MAX_EDUCATION_ITEMS = 8;
export const LOGIN_CODE_TTL_MINUTES = 10;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
export const SESSION_TTL_DAYS = 30;
/** Etapas com menos candidatos que isso aparecem como "menos de N" para ninguém ser identificado. */
export const FUNNEL_MIN_VISIBLE = 5;

export type EducationItem = { level: string; status: string; course: string; school: string };

export const onlyDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

export const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 240;

export function isValidCpf(value: unknown): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export const hashSecret = (value: string) => createHash('sha256').update(value).digest('hex');

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/** Código de 6 dígitos, com zeros à esquerda. */
export const generateLoginCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export function pickFromList<T extends string>(list: readonly T[], value: unknown, fallback: T): T {
  const text = String(value ?? '').trim();
  return (list as readonly string[]).includes(text) ? (text as T) : fallback;
}

/** Aceita só níveis/situações conhecidos e corta textos; ignora lixo. */
export function sanitizeEducation(raw: unknown): EducationItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_EDUCATION_ITEMS).map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      level: pickFromList(EDUCATION_LEVELS, row.level, 'Ensino médio'),
      status: pickFromList(EDUCATION_STATUS, row.status, 'Completo'),
      course: String(row.course ?? '').trim().slice(0, 120),
      school: String(row.school ?? '').trim().slice(0, 120),
    };
  });
}

/** O maior nível de formação concluído ou em andamento, no texto do cadastro de funcionário. */
export function highestEducation(items: EducationItem[]): string | null {
  const ranked = [...items].sort((a, b) => EDUCATION_LEVELS.indexOf(b.level as never) - EDUCATION_LEVELS.indexOf(a.level as never));
  const top = ranked.find((item) => item.status === 'Completo') ?? ranked[0];
  if (!top) return null;
  return top.status === 'Completo' ? top.level : `${top.level} (${top.status.toLowerCase()})`;
}

/** Contagem pública do funil: abaixo do mínimo vira "menos de 5" (nunca o número real). */
export function funnelCount(count: number): { count: number | null; label: string } {
  if (count < FUNNEL_MIN_VISIBLE) return { count: null, label: `menos de ${FUNNEL_MIN_VISIBLE}` };
  return { count, label: String(count) };
}

export type ProfileLike = {
  name?: string | null; cpf?: string | null; phone?: string | null; cep?: string | null; street?: string | null; streetNumber?: string | null;
  neighborhood?: string | null; city?: string | null; state?: string | null; education?: unknown; resumeKey?: string | null;
};

/** Itens obrigatórios do perfil mínimo (LGPD): nome, CPF, contato, endereço, formação e currículo. */
export function profileChecklist(profile: ProfileLike): { key: string; label: string; done: boolean }[] {
  const has = (value: unknown) => String(value ?? '').trim().length > 0;
  return [
    { key: 'name', label: 'Nome completo', done: has(profile.name) },
    { key: 'cpf', label: 'CPF', done: isValidCpf(profile.cpf) },
    { key: 'phone', label: 'Telefone / WhatsApp', done: onlyDigits(profile.phone).length >= 10 },
    { key: 'address', label: 'Endereço', done: [profile.cep, profile.street, profile.streetNumber, profile.neighborhood, profile.city, profile.state].every(has) },
    { key: 'education', label: 'Formação', done: sanitizeEducation(profile.education).length > 0 },
    { key: 'resume', label: 'Currículo', done: has(profile.resumeKey) },
  ];
}

export function profileCompleteness(profile: ProfileLike): { percent: number; missing: string[]; complete: boolean } {
  const list = profileChecklist(profile);
  const done = list.filter((item) => item.done).length;
  return { percent: Math.round((done / list.length) * 100), missing: list.filter((item) => !item.done).map((item) => item.label), complete: done === list.length };
}

export const maskCpf = (value: unknown) => onlyDigits(value).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

export type AccountForAdmission = ProfileLike & { addressComplement?: string | null };

/**
 * Dados do perfil do candidato que o RH reaproveita no cadastro de funcionário (só com o aceite de compartilhar na admissão).
 * Só entra o que foi preenchido; o RH completa o resto (RG, PIS, banco, dependentes...).
 */
export function admissionPrefill(account: AccountForAdmission | null | undefined) {
  if (!account) return {};
  const text = (value: unknown, max = 160) => { const v = String(value ?? '').trim().slice(0, max); return v || undefined; };
  const education = highestEducation(sanitizeEducation(account.education));
  const cpf = isValidCpf(account.cpf) ? onlyDigits(account.cpf) : undefined;
  return {
    cpfDigits: cpf,
    cpfMasked: cpf ? maskCpf(cpf) : undefined,
    secondaryData: {
      cep: text(onlyDigits(account.cep), 8),
      street: text(account.street),
      streetNumber: text(account.streetNumber, 20),
      addressComplement: text(account.addressComplement),
      neighborhood: text(account.neighborhood),
      city: text(account.city),
      state: text(account.state, 2)?.toUpperCase(),
      education: education ?? undefined,
    },
  };
}
