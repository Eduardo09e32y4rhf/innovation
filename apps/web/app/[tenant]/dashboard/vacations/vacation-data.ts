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
