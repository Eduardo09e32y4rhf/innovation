'use client';

import { useCallback, useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api, type AccountingPeriodStatus } from '@/app/lib/api';
import { office } from '../platform/_hub/office-api';
import { deadlineFor, fmtDate, isOverdue, matchesFilter, STATUS_FILTERS, type StatusFilter } from './_model';
import { StatusBadge } from './_status-badge';

interface Row { id: string; name: string; document: string | null; status: AccountingPeriodStatus | null; failed: boolean }

/** Busca o período de cada empresa com no máximo 4 requisições simultâneas. */
async function loadRows(month: string): Promise<Row[]> {
  const dash = await office.dashboard(month);
  const clients = dash.clients;
  const out: Row[] = new Array(clients.length);
  let next = 0;
  const worker = async () => {
    while (next < clients.length) {
      const i = next++;
      const c = clients[i];
      try { out[i] = { id: c.id, name: c.name, document: c.document ?? null, status: (await api.accounting.period(c.id, month)).status, failed: false }; }
      catch { out[i] = { id: c.id, name: c.name, document: c.document ?? null, status: null, failed: true }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, clients.length) }, worker));
  return out;
}

export function OfficePanel({ month, onMonth, onOpen }: { month: string; onMonth: (m: string) => void; onOpen: (id: string, name: string) => void }) {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const fetcher = useCallback(() => loadRows(month), [month]);
  const q = useQuery(fetcher, [month]);
  const rows = useMemo(() => (q.data ?? []).filter((r) => matchesFilter(r.status, filter)), [q.data, filter]);

  return (
    <section aria-labelledby="painel-titulo" className="space-y-4">
      <div className="card-v2 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <h2 id="painel-titulo" className="text-lg font-semibold sm:mr-auto">Empresas atendidas</h2>
        <label className="flex flex-col gap-1 text-xs font-semibold text-fg-sub">Mês de competência
          <input type="month" value={month} onChange={(e) => e.target.value && onMonth(e.target.value)} className="input-v2 min-h-11" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-fg-sub">Status
          <select value={filter} onChange={(e) => setFilter(e.target.value as StatusFilter)} className="input-v2 min-h-11">
            {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
      </div>
      {q.loading && !q.data ? <LoadingState label="Carregando empresas…" /> : q.error ? <ErrorState message={q.error} onRetry={q.refetch} /> : rows.length === 0 ? (
        <EmptyState message="Nenhuma empresa encontrada. Ajuste o filtro de status ou o mês." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id} className="card-v2 flex flex-col gap-3 p-4">
              <div className="min-w-0">
                <p className="break-words font-semibold">{r.name}</p>
                {r.document && <p className="text-xs text-fg-sub">{r.document}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} />
                {r.failed && <span className="text-xs text-rose-700">Status indisponível</span>}
              </div>
              <p className={`text-xs ${isOverdue(month, r.status) ? 'font-semibold text-rose-700' : 'text-fg-sub'}`}>
                Prazo: {fmtDate(deadlineFor(month))}{isOverdue(month, r.status) ? ' (vencido)' : ''}
              </p>
              <button type="button" onClick={() => onOpen(r.id, r.name)} aria-label={`Abrir ${r.name}`} className="btn btn-outline mt-auto min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">Abrir mês</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
