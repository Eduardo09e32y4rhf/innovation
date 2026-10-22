'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { AdjustForm } from './_adjust-form';
import { brl, fieldLabel, fmtDate, fmtDayMonth, fmtMinutes, type MonthRow } from './_model';

const hhmm = (v: string | null) => (v ? (v.length > 5 && v.includes('T') ? v.slice(11, 16) : v.slice(0, 5)) : '—');

export function EmployeeDrawer({ companyId, month, row, canAdjust, onClose, onAdjusted }: {
  companyId: string; month: string; row: MonthRow; canAdjust: boolean; onClose: () => void; onAdjusted: () => void;
}) {
  const q = useQuery(useCallback(() => api.accounting.employeeTimeSheet(companyId, row.employeeId, month), [companyId, row.employeeId, month]), [companyId, row.employeeId, month]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);

  const data = q.data;
  const closing = data?.closings.find((c) => c.id === row.closingId) ?? data?.closings[0];
  const adjustments = closing?.adjustments ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="ficha-titulo" className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0"><h3 id="ficha-titulo" className="break-words text-lg font-semibold">{row.name}</h3><p className="text-sm text-fg-sub">{row.position ?? 'Funcionário'} · {month.split('-').reverse().join('/')}</p></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar ficha" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <section aria-labelledby="calc-titulo">
            <h4 id="calc-titulo" className="mb-2 font-semibold">Cálculo item a item</h4>
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              {[['Horas trabalhadas', fmtMinutes(row.workedMinutes)], ['Extras 50%', fmtMinutes(row.overtime50Minutes)], ['Extras 100%', fmtMinutes(row.overtime100Minutes)], ['Adicional noturno', fmtMinutes(row.nightShiftMinutes)],
                ['Faltas', `${row.absenceDays} dia(s)`], ['Atrasos', fmtMinutes(row.lateMinutes)], ['Salário bruto', brl(row.gross)], ['Descontos', brl(row.discounts)], ['Líquido', brl(row.net)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 px-3 py-2"><dt className="text-fg-sub">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="aj-titulo">
            <h4 id="aj-titulo" className="mb-2 font-semibold">Ajustes manuais (calculado × ajustado)</h4>
            {adjustments.length === 0 ? <p className="text-sm text-fg-sub">Nenhum ajuste neste mês.</p> : (
              <ul className="space-y-2">{adjustments.map((a) => (
                <li key={a.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-semibold">{fieldLabel(a.field)}</p>
                  <p>Calculado: <span className="line-through">{a.oldValue}</span> → Ajustado: <strong>{a.newValue}</strong></p>
                  <p className="break-words text-fg-sub">Motivo: {a.reason} · {fmtDate(a.createdAt)}</p>
                </li>))}</ul>
            )}
            {canAdjust && row.closingId
              ? <AdjustForm closingId={row.closingId} onDone={() => { q.refetch(); onAdjusted(); }} />
              : <p className="mt-3 text-sm text-fg-sub">{canAdjust ? 'Funcionário sem fechamento para ajustar.' : 'Ajustes só estão disponíveis depois do cálculo e antes da publicação.'}</p>}
          </section>
          <section aria-labelledby="esp-titulo">
            <h4 id="esp-titulo" className="mb-2 font-semibold">Espelho de ponto</h4>
            {q.loading && !data ? <LoadingState label="Carregando ponto…" /> : q.error ? <ErrorState message={q.error} onRetry={q.refetch} /> : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
                {(data?.days ?? []).map((d) => (
                  <li key={d.date} className="grid grid-cols-[3rem_1fr_auto] gap-2 px-3 py-2">
                    <span className="font-medium">{fmtDayMonth(d.date)}</span>
                    <span className="min-w-0 break-words text-fg-sub">{hhmm(d.punches.entry)} · {hhmm(d.punches.lunchStart)} · {hhmm(d.punches.lunchReturn)} · {hhmm(d.punches.exit)}{d.manualAdjustment ? ' (ajuste de ponto)' : ''}{d.occurrence && d.occurrence !== 'NORMAL' ? ` · ${d.occurrence}` : ''}</span>
                    <span className="font-medium">{fmtMinutes(d.workedMinutes)}</span>
                  </li>
                ))}
                {(data?.days.length ?? 0) === 0 && <li className="px-3 py-3 text-fg-sub">Sem batidas no mês.</li>}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
