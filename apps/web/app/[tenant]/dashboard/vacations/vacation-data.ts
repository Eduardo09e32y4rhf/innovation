import type { Vacation } from '@/app/lib/api';

export interface VacationEntitlement {
  id: string; acquisitionStart: string; acquisitionEnd: string;
  concessionEnd: string; entitledDays: number; usedDays: number;
  soldDays: number; reservedDays: number;
}
export type VacationRow = Vacation & { soldDays?: number; entitlement?: VacationEntitlement | null };

export function diffDays(start: string, end: string) {
  if (!start || !end) return 0;
  const difference = Date.parse(end.slice(0, 10)) - Date.parse(start.slice(0, 10));
  return Number.isFinite(difference) && difference >= 0 ? Math.floor(difference / 86400000) + 1 : 0;
}
export function availableDays(entitlement: VacationEntitlement) {
  return entitlement.entitledDays - entitlement.usedDays - entitlement.soldDays - entitlement.reservedDays;
}
export function acquisitionWindow(admissionValue: string, startValue: string) {
  const admission = new Date(admissionValue.slice(0, 10) + 'T12:00:00Z');
  const start = new Date(startValue.slice(0, 10) + 'T12:00:00Z');
  if (!Number.isFinite(admission.getTime()) || !Number.isFinite(start.getTime())) return null;
  const months = (start.getUTCFullYear() - admission.getUTCFullYear()) * 12 + start.getUTCMonth() - admission.getUTCMonth() - (start.getUTCDate() < admission.getUTCDate() ? 1 : 0);
  if (months < 12) return null;
  const from = new Date(admission);
  from.setUTCMonth(from.getUTCMonth() + Math.max(0, Math.floor(months / 12) - 1) * 12);
  const to = new Date(from); to.setUTCFullYear(to.getUTCFullYear() + 1); to.setUTCDate(to.getUTCDate() - 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), label: from.getUTCFullYear() + '/' + to.getUTCFullYear() };
}

export type RadarKind = 'OVERDUE' | 'CRITICAL' | 'AVAILABLE' | 'ACQUIRING' | 'TAKEN';
export interface RadarItem {
  employeeId: string; name: string; registration?: string | null; admissionDate: string; kind: RadarKind;
  /** Rótulo AAAA/AAAA do ciclo em foco. */
  cycle: string; deadline: string | null; daysToDeadline: number | null; takenDays: number; monthsOfService: number; detail: string;
}
const CYCLE_DAYS = 30;
const ORDER: Record<RadarKind, number> = { OVERDUE: 0, CRITICAL: 1, AVAILABLE: 2, ACQUIRING: 3, TAKEN: 4 };
const addYears = (date: Date, years: number) => { const copy = new Date(date); copy.setUTCFullYear(copy.getUTCFullYear() + years); return copy; };

/**
 * Radar de férias pelo tempo de casa: cada ciclo vira direito aos 12 meses e vence 12 meses depois
 * (aos 24). Considera pedidos pendentes, aprovados e concluídos como dias já usados no ciclo.
 */
export function vacationRadar(
  employees: { id: string; name: string; registration?: string | null; admissionDate?: string | null; status?: string }[],
  rows: VacationRow[], now = new Date(),
): RadarItem[] {
  const today = new Date(now.toISOString().slice(0, 10) + 'T12:00:00Z');
  const items: RadarItem[] = [];
  for (const employee of employees) {
    if (!employee.admissionDate || (employee.status && !['ACTIVE', 'ONBOARDING'].includes(employee.status))) continue;
    const admission = new Date(employee.admissionDate.slice(0, 10) + 'T12:00:00Z');
    if (!Number.isFinite(admission.getTime())) continue;
    const months = (today.getUTCFullYear() - admission.getUTCFullYear()) * 12 + today.getUTCMonth() - admission.getUTCMonth() - (today.getUTCDate() < admission.getUTCDate() ? 1 : 0);
    const base = { employeeId: employee.id, name: employee.name, registration: employee.registration, admissionDate: employee.admissionDate, monthsOfService: months };
    if (months < 12) {
      const unlock = addYears(admission, 1);
      items.push({ ...base, kind: 'ACQUIRING', cycle: `${admission.getUTCFullYear()}/${unlock.getUTCFullYear()}`, deadline: unlock.toISOString().slice(0, 10), daysToDeadline: Math.ceil((unlock.getTime() - today.getTime()) / 86400000), takenDays: 0, detail: `Faltam ${12 - months} mês(es) para ter direito.` });
      continue;
    }
    const mine = rows.filter(row => row.employeeId === employee.id && ['PENDING', 'APPROVED', 'COMPLETED'].includes(row.status));
    const cycles = Math.floor(months / 12);
    let picked: RadarItem | null = null;
    for (let k = 1; k <= cycles; k += 1) {
      const start = addYears(admission, k - 1); const end = addYears(admission, k); const limit = addYears(admission, k + 1);
      const label = `${start.getUTCFullYear()}/${end.getUTCFullYear()}`;
      const taken = mine.filter(row => row.acquisitionPeriod === label).reduce((sum, row) => sum + (row.daysUsed || 0) + (row.soldDays || 0), 0);
      if (taken >= CYCLE_DAYS) continue;
      const left = Math.ceil((limit.getTime() - today.getTime()) / 86400000);
      const kind: RadarKind = left < 0 ? 'OVERDUE' : left <= 90 ? 'CRITICAL' : 'AVAILABLE';
      const detail = kind === 'OVERDUE' ? `Prazo venceu há ${-left} dia(s). Saldo ${CYCLE_DAYS - taken} dias.` : `${kind === 'CRITICAL' ? 'Vence' : 'Pode tirar até'} ${limit.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} (${left} dia(s)). Saldo ${CYCLE_DAYS - taken} dias.`;
      picked = { ...base, kind, cycle: label, deadline: limit.toISOString().slice(0, 10), daysToDeadline: left, takenDays: taken, detail };
      break;
    }
    items.push(picked ?? { ...base, kind: 'TAKEN', cycle: `${addYears(admission, cycles - 1).getUTCFullYear()}/${addYears(admission, cycles).getUTCFullYear()}`, deadline: null, daysToDeadline: null, takenDays: CYCLE_DAYS, detail: 'Férias dos ciclos completos já tiradas.' });
  }
  return items.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (a.daysToDeadline ?? 9999) - (b.daysToDeadline ?? 9999) || a.name.localeCompare(b.name, 'pt-BR'));
}

export async function processVacationDecisions(
  ids: string[], rows: VacationRow[], update: (id: string) => Promise<unknown>,
) {
  const results: { id: string; success: boolean; message: string }[] = [];
  for (const id of [...new Set(ids)]) {
    if (!rows.some(row => row.id === id && row.status === 'PENDING')) {
      results.push({ id, success: false, message: 'A solicitação já não está pendente. Atualize a lista.' });
      continue;
    }
    try { await update(id); results.push({ id, success: true, message: 'Decisão salva.' }); }
    catch (error) { results.push({ id, success: false, message: error instanceof Error ? error.message : 'Não foi possível salvar a decisão.' }); }
  }
  return results;
}
