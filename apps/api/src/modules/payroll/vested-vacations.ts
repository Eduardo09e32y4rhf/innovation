import { addDays, addMonths, fullYearsBetween, parseDay } from './labor-dates';

export interface EntitlementRecord {
  acquisitionStart: Date | string;
  entitledDays: number;
  usedDays: number;
  soldDays: number;
  concessionEnd?: Date | string | null;
}

export interface VestedVacation {
  label: string;
  pendingDays: number;
  /** Período concessivo já expirado na data do desligamento: férias pagas em dobro (CLT art. 137). */
  doubled: boolean;
  concessionEnd: string;
}

/**
 * Períodos aquisitivos completos (CLT art. 130/146 caput) ainda não gozados.
 * A linha do tempo vem da admissão (os registros de VacationEntitlement só existem quando houve solicitação);
 * quando há registro do período, ele define dias de direito (art. 130, faltas) e dias já usados/vendidos.
 * Dobra (art. 137): período concessivo (12 meses após o aquisitivo, art. 134) vencido antes do desligamento.
 */
export function deriveVestedVacations(input: {
  admission: Date | string;
  termination: Date | string;
  projectedEnd: Date | string;
  entitlements: EntitlementRecord[];
}): VestedVacation[] {
  const admission = parseDay(input.admission);
  const termination = parseDay(input.termination);
  const projectedEnd = parseDay(input.projectedEnd);
  const completed = fullYearsBetween(admission, projectedEnd);
  const byStart = new Map(input.entitlements.map((e) => [parseDay(e.acquisitionStart).toISOString().slice(0, 10), e]));
  const out: VestedVacation[] = [];

  for (let k = 0; k < completed; k++) {
    const start = addMonths(admission, 12 * k);
    const end = addDays(addMonths(admission, 12 * (k + 1)), -1);
    const rec = byStart.get(start.toISOString().slice(0, 10));
    const entitled = rec ? rec.entitledDays : 30;
    const pending = Math.max(0, entitled - (rec ? rec.usedDays + rec.soldDays : 0));
    if (pending === 0) continue;
    const concessionEnd = rec?.concessionEnd ? parseDay(rec.concessionEnd) : addMonths(addDays(end, 1), 12);
    const concessionLast = rec?.concessionEnd ? concessionEnd : addDays(concessionEnd, -1);
    out.push({
      label: `${start.toISOString().slice(0, 10)} a ${end.toISOString().slice(0, 10)}`,
      pendingDays: pending,
      doubled: concessionLast.getTime() < termination.getTime(),
      concessionEnd: concessionLast.toISOString().slice(0, 10),
    });
  }
  return out;
}
