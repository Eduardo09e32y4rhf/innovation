import type { AccountingPeriodEmployee, AccountingPeriodStatus, AccountingPeriodView, AccountingTimeSheetEmployeeRow } from '@/app/lib/api';

export const ACCOUNTANT_ROLES = ['DEV', 'CEO', 'CONTABIL'];
export const HR_ROLES = ['DEV', 'ADMIN', 'RH'];

export type StatusFilter = 'ALL' | 'NONE' | AccountingPeriodStatus;

const LABELS: Record<AccountingPeriodStatus, string> = {
  DRAFT: 'Rascunho', CALCULATED: 'Calculada', PUBLISHED: 'Publicada para a empresa',
  RETURNED: 'Devolvida pelo RH', RELEASED: 'Holerites liberados', PAID: 'Paga',
};

/** Rótulo do status; null/ausente = competência ainda não iniciada. */
export function statusLabel(status: AccountingPeriodStatus | null | undefined): string {
  return status ? (LABELS[status] ?? status) : 'Não iniciada';
}

export function statusTone(status: AccountingPeriodStatus | null | undefined): string {
  switch (status) {
    case 'CALCULATED': return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'PUBLISHED': return 'border-indigo-200 bg-indigo-50 text-indigo-800';
    case 'RETURNED': return 'border-amber-300 bg-amber-50 text-amber-900';
    case 'RELEASED': return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'PAID': return 'border-emerald-300 bg-emerald-100 text-emerald-900';
    default: return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

export const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'Todos os status' }, { value: 'NONE', label: 'Não iniciada' },
  ...(Object.keys(LABELS) as AccountingPeriodStatus[]).map((value) => ({ value, label: LABELS[value] })),
];

export function matchesFilter(status: AccountingPeriodStatus | null | undefined, filter: StatusFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'NONE') return !status;
  return status === filter;
}

export interface AccountantActions { calculate: boolean; publish: boolean; adjust: boolean; discardOption: boolean }

/** O contador só mexe enquanto a competência não está com o RH (publicada) nem liberada/paga. */
export function accountantActions(status: AccountingPeriodStatus | null | undefined, role: string | undefined, employees = 1): AccountantActions {
  const none = { calculate: false, publish: false, adjust: false, discardOption: false };
  if (!ACCOUNTANT_ROLES.includes(String(role ?? '').toUpperCase())) return none;
  if (status === 'PUBLISHED' || status === 'RELEASED' || status === 'PAID') return none;
  const calculated = status === 'CALCULATED' || status === 'RETURNED';
  return { calculate: true, publish: calculated && employees > 0, adjust: calculated, discardOption: calculated };
}

export interface HrActions { returnToAccountant: boolean; release: boolean; markPaid: boolean; showBlock: boolean }

export function hrActions(status: AccountingPeriodStatus | null | undefined, role: string | undefined): HrActions {
  const allowed = HR_ROLES.includes(String(role ?? '').toUpperCase());
  return {
    showBlock: allowed && (status === 'PUBLISHED' || status === 'RELEASED' || status === 'PAID' || status === 'RETURNED'),
    returnToAccountant: allowed && status === 'PUBLISHED',
    release: allowed && status === 'PUBLISHED',
    markPaid: allowed && status === 'RELEASED',
  };
}

/** Prazo interno: dia 5 do mês seguinte à competência (AAAA-MM). */
export function deadlineFor(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${next.y}-${String(next.m).padStart(2, '0')}-05`;
}

export function isOverdue(month: string, status: AccountingPeriodStatus | null | undefined, today = new Date()): boolean {
  if (status && status !== 'DRAFT' && status !== 'CALCULATED' && status !== 'RETURNED') return false;
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return t > deadlineFor(month);
}

export const fmtDate = (iso?: string | null): string => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
export const fmtDayMonth = (iso?: string | null): string => (iso ? iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '—');

export function fmtMinutes(min: number | null | undefined): string {
  const n = Math.round(Number(min));
  if (!Number.isFinite(n) || n === 0) return '0h00';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, '0')}`;
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl = (v: number | string | null | undefined): string => {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? '—' : BRL.format(n);
};

export interface MonthRow extends AccountingPeriodEmployee {
  position: string | null; workedMinutes: number; overtime50Minutes: number; overtime100Minutes: number;
  nightShiftMinutes: number; absenceDays: number; lateMinutes: number;
}

/** Junta o resumo do período (valores) com o resumo de ponto (horas), por funcionário. */
export function mergeRows(employees: AccountingPeriodEmployee[], sheets: AccountingTimeSheetEmployeeRow[]): MonthRow[] {
  const by = new Map(sheets.map((s) => [s.employeeId, s]));
  return employees.map((e) => {
    const s = by.get(e.employeeId);
    return {
      ...e, position: s?.position ?? null, workedMinutes: s?.workedMinutes ?? 0, overtime50Minutes: s?.overtime50Minutes ?? 0,
      overtime100Minutes: s?.overtime100Minutes ?? 0, nightShiftMinutes: s?.nightShiftMinutes ?? 0,
      absenceDays: s?.absenceDays ?? 0, lateMinutes: s?.lateMinutes ?? 0,
    };
  });
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Totais exibidos: usa os do período; se ausentes, soma as linhas (INSS/FGTS/IRRF só vêm do período). */
export function periodTotals(view: Pick<AccountingPeriodView, 'totals' | 'employees'>) {
  const t = view.totals;
  const sum = (k: 'gross' | 'discounts' | 'net') => r2(view.employees.reduce((s, e) => s + (Number(e[k]) || 0), 0));
  return {
    gross: t?.gross ?? sum('gross'), discounts: t?.discounts ?? sum('discounts'), net: t?.net ?? sum('net'),
    inss: t?.inss ?? 0, fgts: t?.fgts ?? 0, irrf: t?.irrf ?? 0, employees: t?.employees ?? view.employees.length,
    manualAdjustments: view.employees.filter((e) => e.hasManualAdjustment).length,
  };
}

export const ADJUST_FIELDS = [
  // A API guarda horas extras e noturno em HORAS (converte para minutos no cálculo); valores em R$ são derivados.
  { value: 'salaryBase', label: 'Salário base (R$)' }, { value: 'overtime50', label: 'Horas extras 50% (horas, ex.: 1,5 = 1h30)' },
  { value: 'overtime100', label: 'Horas extras 100% (horas, ex.: 1,5 = 1h30)' }, { value: 'nightShift', label: 'Adicional noturno (horas noturnas)' },
  { value: 'absenceMinutes', label: 'Faltas (minutos)' }, { value: 'lateMinutes', label: 'Atrasos (minutos)' },
  { value: 'earlyLeaveMinutes', label: 'Saídas antecipadas (minutos)' },
] as const;

export const fieldLabel = (field: string): string => ADJUST_FIELDS.find((f) => f.value === field)?.label ?? field;

export function validateAdjust(value: string, reason: string): string | null {
  const n = Number(value.replace(',', '.'));
  if (value.trim() === '' || !Number.isFinite(n) || n < 0) return 'Informe um valor igual ou maior que zero.';
  if (reason.trim().length < 5) return 'Informe o motivo do ajuste (mínimo 5 caracteres).';
  return null;
}

export const currentMonth = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
