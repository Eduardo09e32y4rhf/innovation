'use client';

import { CalendarClock } from 'lucide-react';
import { csvDocument } from '../../_components/csv';
import { WORKFLOW_STATUS, money } from '../format';
import type { AccountingCompany } from '../types';

export const input = 'input-v2 w-full text-base sm:text-sm';
export const CLOSING_FIELDS = [['salaryBase', 'Salário base (R$)'], ['overtime50', 'Hora extra 50% (h)'], ['overtime100', 'Hora extra 100% (h)'], ['nightShift', 'Adicional noturno (h)'], ['absenceMinutes', 'Faltas (min)'], ['lateMinutes', 'Atrasos (min)'], ['earlyLeaveMinutes', 'Saídas antecipadas (min)']] as const;
export const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', IN_REVIEW: 'bg-sky-100 text-sky-800', PROCESSING: 'bg-sky-100 text-sky-800', APPROVED: 'bg-emerald-100 text-emerald-800', CLOSED: 'bg-emerald-200 text-emerald-900', PAID: 'bg-emerald-200 text-emerald-900', CANCELLED: 'bg-rose-100 text-rose-800',
};
export type Closing = AccountingCompany['closings'][number];
export type Payroll = AccountingCompany['payrolls'][number];

export function saveCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([csvDocument(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-rose-600' : 'text-fg';
  return (
    <article className="rounded-2xl border border-border bg-bg p-4 shadow-sm">
      <p className="text-xs font-semibold text-fg-sub">{label}</p>
      <p className={`mt-1 truncate text-xl font-black tabular-nums ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-fg-mut">{hint}</p>}
    </article>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_TONE[status] ?? 'bg-slate-100 text-slate-700'}`}>{WORKFLOW_STATUS[status] ?? status}</span>;
}

/** Valores calculados nesta competência; as guias oficiais podem ter bases diferentes. */
export function Obligations({ inss, irrf, fgts }: { inss: number; irrf: number; fgts: number }) {
  const items: Array<[string, string, number]> = [['INSS descontado dos funcionários', 'GPS / eSocial', inss], ['IRRF retido', 'DARF 0561', irrf], ['FGTS do mês', 'Guia do FGTS Digital', fgts]];
  return (
    <section aria-label="Obrigações do mês" className="rounded-2xl border border-border bg-bg p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><CalendarClock size={15} aria-hidden="true" /> Obrigações da competência</h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Valores para conferência</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map(([label, guide, value]) => (
          <li key={label} className="rounded-xl bg-bg-sub p-3"><p className="text-xs font-semibold text-fg-sub">{label}</p><p className="text-lg font-black tabular-nums text-fg">{money(value)}</p><p className="text-[11px] text-fg-mut">{guide}</p></li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-fg-mut">INSS e IRRF são retidos do funcionário; FGTS é da empresa. São estimativas da folha ou do fechamento quando ainda não há folha. Confira bases, guias e vencimentos no eSocial e no FGTS Digital.</p>
    </section>
  );
}
