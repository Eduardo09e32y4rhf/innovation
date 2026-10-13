import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

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

// ---------- senha ----------
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_MINUTES = 15;

/** scrypt com sal por senha. Formato: scrypt$<sal hex>$<hash hex>. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  const [scheme, saltHex, hashHex] = String(stored ?? '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Devolve a mensagem de erro, ou null se a senha serve. */
export function passwordProblem(password: unknown): string | null {
  const value = String(password ?? '');
  if (value.length < PASSWORD_MIN) return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (value.length > PASSWORD_MAX) return `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`;
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Use letras e números na senha.';
  return null;
}

// ---------- perfil profissional ----------
export const DRIVER_LICENSE_CATEGORIES = ['A', 'B', 'AB', 'C', 'D', 'E', 'AC', 'AD', 'AE'] as const;
export const MAX_SKILLS = 15;

/** "AAAA-MM-DD" válida, não futura e de quem tem pelo menos 14 anos. Vazio limpa o campo. */
export function parseBirthDate(value: unknown, now = new Date()): Date | null | undefined {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) return undefined;
  const youngest = new Date(Date.UTC(now.getUTCFullYear() - 14, now.getUTCMonth(), now.getUTCDate()));
  if (date > youngest || date.getUTCFullYear() < 1900) return undefined;
  return date;
}

export function sanitizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const text = String(item ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const key = text.toLocaleLowerCase('pt-BR');
    if (text && !seen.has(key)) { seen.add(key); out.push(text); }
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}

export const MAX_EXPERIENCE_ITEMS = 10;
export type ExperienceItem = { role: string; company: string; start: string | null; end: string | null; current: boolean; description: string };

const monthOrNull = (value: unknown) => { const text = String(value ?? '').trim(); return /^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(text) ? text : null; };

/** Experiências profissionais: exige cargo, corta textos e aceita só meses "AAAA-MM". Mais recentes primeiro. */
export function sanitizeExperience(raw: unknown): ExperienceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_EXPERIENCE_ITEMS).map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const current = row.current === true;
    return {
      role: String(row.role ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
      company: String(row.company ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
      start: monthOrNull(row.start),
      end: current ? null : monthOrNull(row.end),
      current,
      description: String(row.description ?? '').trim().slice(0, 600),
    };
  }).filter((item) => item.role)
    .sort((a, b) => Number(b.current) - Number(a.current) || String(b.end ?? b.start ?? '').localeCompare(String(a.end ?? a.start ?? '')));
}

export const ageFrom =(birthDate: Date | null | undefined, now = new Date()) => {
  if (!birthDate) return null;
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  if (now.getUTCMonth() < birthDate.getUTCMonth() || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
};

type TalentLike = ProfileLike & { id: string; birthDate?: Date | null; profession?: string | null; skills?: unknown; about?: string | null; experience?: unknown; hasDriverLicense?: boolean | null; driverLicenseCategory?: string | null; updatedAt?: Date };

/**
 * O que o RH de OUTRA empresa enxerga de quem aceitou o banco de talentos.
 * Sem CPF, e-mail, telefone, rua/número nem data de nascimento exata: o contato sai por convite pela plataforma.
 */
export function talentCard(account: TalentLike, now = new Date()) {
  const education = sanitizeEducation(account.education);
  return {
    id: account.id,
    name: String(account.name ?? '').trim(),
    age: ageFrom(account.birthDate ?? null, now),
    profession: account.profession ?? null,
    skills: sanitizeSkills(account.skills),
    about: account.about ?? null,
    experience: sanitizeExperience(account.experience).map(({ role, company, start, end, current }) => ({ role, company, start, end, current })),
    city: account.city ?? null,
    state: account.state ?? null,
    neighborhood: account.neighborhood ?? null,
    education,
    highestEducation: highestEducation(education),
    hasDriverLicense: account.hasDriverLicense ?? null,
    driverLicenseCategory: account.hasDriverLicense ? account.driverLicenseCategory ?? null : null,
    hasResume: Boolean(account.resumeKey),
    updatedAt: account.updatedAt ?? null,
  };
}
