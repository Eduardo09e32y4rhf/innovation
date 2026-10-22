'use client';



export const MODULES: { id: string; label: string }[] = [
  { id: 'employees', label: 'Funcionários' },
  { id: 'time-track', label: 'Controle de Ponto' },
  { id: 'vacations', label: 'Férias' },
  { id: 'management', label: 'Painel de Gestão' },
  { id: 'recruitment', label: 'Vagas e recrutamento' },
];

export const CYCLE_LABEL: Record<string, string> = {
  MONTHLY: 'mês',
  QUARTERLY: 'trimestre',
  YEARLY: 'ano',
};

// Prisma Decimal vem como string — converte com segurança
export function parseMoney(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const raw = String(val).trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatBRL(val: any): string {
  return parseMoney(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
