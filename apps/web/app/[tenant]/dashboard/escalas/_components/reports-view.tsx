'use client';

import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi } from '../_lib/hub-api';
import { currentMonthKey, errorMessage, fmtMinutes, monthLabel, shiftMonth } from '../_lib/format';

export function ReportsView({ month, setMonth }: { month: string; setMonth: (month: string) => void }) {
  const report = useQuery(() => hubApi.reports(month), [month]);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const data = report.data;
  const rows = (data?.rows ?? []).filter((row) => !search.trim() || `${row.name} ${row.department}`.toLowerCase().includes(search.trim().toLowerCase()));
  const t = data?.indicators.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></Button>
          <h2 className="min-w-[150px] text-center text-base font-semibold capitalize">{monthLabel(month)}</h2>
          <Button variant="outline" size="sm" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></Button>
          {month !== currentMonthKey() && <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonthKey())}>Hoje</Button>}
        </div>
        <div className="flex gap-2">
          <input className="input-v2 text-sm" placeholder="Buscar pessoa ou setor" aria-label="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button variant="outline" isLoading={exporting} onClick={async () => { setExporting(true); try { await hubApi.exportReport(month); } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível exportar.')); } finally { setExporting(false); } }}><Download size={16} aria-hidden="true" /> Exportar CSV</Button>
        </div>
      </div>

      {report.error && <ErrorState message={report.error} onRetry={report.refetch} />}
      {report.loading && !data ? <LoadingState label="Carregando relatório…" /> : data && t ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[['Horas trabalhadas', fmtMinutes(t.worked)], ['Horas extras', fmtMinutes(t.overtime50 + t.overtime100)], ['Atrasos', fmtMinutes(t.late)], ['Faltas (dias)', String(t.absences)], ['Banco de horas', fmtMinutes(t.bankBalance, true)]].map(([label, value]) => (
              <div key={label} className="card-v2 p-4"><p className="text-sm text-fg-sub">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>
            ))}
          </div>
          <div className="card-v2 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <caption className="sr-only">Totais por funcionário no mês</caption>
              <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Funcionário', 'Setor', 'Dias', 'Horas', 'Saldo', 'Atrasos', 'HE 50%', 'HE 100%', 'Noturno', 'Banco'].map((title) => <th key={title} scope="col" className="px-3 py-2.5 font-medium">{title}</th>)}</tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.employeeId} className="border-b border-border last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-medium">{row.name}</th><td className="px-3 py-2 text-fg-sub">{row.department || '—'}</td><td className="px-3 py-2 tabular-nums">{row.days}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtMinutes(row.worked)}</td><td className="px-3 py-2 tabular-nums">{fmtMinutes(row.balance, true)}</td><td className="px-3 py-2 tabular-nums">{fmtMinutes(row.late)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtMinutes(row.overtime50)}</td><td className="px-3 py-2 tabular-nums">{fmtMinutes(row.overtime100)}</td><td className="px-3 py-2 tabular-nums">{fmtMinutes(row.night)}</td><td className="px-3 py-2 tabular-nums">{fmtMinutes(row.bank, true)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-fg-sub">Nenhum registro no mês.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
