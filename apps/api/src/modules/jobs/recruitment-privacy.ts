/** Regras puras de LGPD e comunicação do recrutamento (sem banco), para teste fácil. */
export const PRIVACY_VERSION = '2026-10';
export const DEFAULT_RETENTION_MONTHS = 12;
export const MIN_RETENTION_MONTHS = 3;
export const MAX_RETENTION_MONTHS = 60;

export const REJECTION_CODES: Record<string, string> = {
  PERFIL: 'Perfil não aderente à vaga',
  EXPERIENCIA: 'Experiência insuficiente',
  SALARIO: 'Pretensão salarial acima da faixa',
  LOCALIZACAO: 'Localização incompatível',
  DISPONIBILIDADE: 'Disponibilidade incompatível',
  COMPORTAMENTAL: 'Perfil comportamental não aderente',
  DESISTENCIA: 'Candidato desistiu',
  VAGA_CANCELADA: 'Vaga cancelada ou preenchida',
  OUTRO: 'Outro motivo',
};

export const GENDER_OPTIONS = ['MULHER', 'HOMEM', 'NAO_BINARIO', 'PREFIRO_NAO_INFORMAR'] as const;
export const RACE_OPTIONS = ['AMARELA', 'BRANCA', 'INDIGENA', 'PARDA', 'PRETA', 'PREFIRO_NAO_INFORMAR'] as const;
export const REQUEST_TYPES = ['ACCESS', 'CORRECTION', 'DELETION'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export function clampRetention(months: unknown): number {
  const value = Math.trunc(Number(months));
  if (!Number.isFinite(value)) return DEFAULT_RETENTION_MONTHS;
  return Math.min(MAX_RETENTION_MONTHS, Math.max(MIN_RETENTION_MONTHS, value));
}

export function retentionDate(months: number, from = new Date()): Date {
  const date = new Date(from);
  date.setUTCMonth(date.getUTCMonth() + clampRetention(months));
  return date;
}

/** Candidato contratado vira funcionário (outra base legal); reprovado ou em andamento segue o prazo de retenção. */
export function isExpiredForDeletion(app: { retentionUntil?: Date | null; anonymizedAt?: Date | null; status: string }, now = new Date()): boolean {
  if (app.anonymizedAt || app.status === 'HIRED' || !app.retentionUntil) return false;
  return app.retentionUntil.getTime() <= now.getTime();
}

export function pickOption<T extends readonly string[]>(options: T, value: unknown): T[number] | null {
  const key = String(value ?? '').trim().toUpperCase();
  return (options as readonly string[]).includes(key) ? (key as T[number]) : null;
}

export function parsePcd(value: unknown): boolean | null {
  const v = String(value ?? '').trim().toLowerCase();
  if (['true', 'sim', 'yes', '1'].includes(v)) return true;
  if (['false', 'nao', 'não', 'no', '0'].includes(v)) return false;
  return null;
}

export function newTrackingToken(randomHex: string): string {
  return randomHex.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 40);
}

export const STAGE_LABEL_FOR_CANDIDATE: Record<string, string> = {
  APPLIED: 'Candidatura recebida',
  SCREENING: 'Em análise pelo RH',
  INTERVIEW: 'Em fase de entrevistas',
  OFFER: 'Proposta em andamento',
  HIRED: 'Processo concluído: você foi selecionado(a)',
  REJECTED: 'Processo encerrado para esta vaga',
};

/** Telefone só com dígitos (sem DDI 55); vazio se curto demais para comparar. */
export function phoneKey(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return digits.length >= 10 ? digits : null;
}
