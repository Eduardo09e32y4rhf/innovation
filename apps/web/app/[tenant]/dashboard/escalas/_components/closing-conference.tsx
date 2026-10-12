'use client';

import { AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';

const dateBr = (value: string) => value.slice(0, 10).split('-').reverse().join('/');

/**
 * Conferência legal antes de fechar a folha (CLT, Portaria MTP 671/2021): marcações ímpares, ajustes sem ciência do gestor,
 * extras acima de 2h, intervalo, interjornada de 11h, faltas e perda de DSR. Pendências vermelhas travam o fechamento.
 */
export function ClosingConference({ month, canForce, onForce }: { month: string; canForce: boolean; onForce: () => void }) {
  const query = useQuery(() => api.timeClosing.conference(month), [month]);
  const [open, setOpen] = useState<string | null>(null);
  if (query.loading && !query.data) return <LoadingState label="Conferindo o ponto do mês…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.refetch} />;
  const data = query.data;
  if (!data) return null;
  const { totals } = data;
  const blocked = totals.blocking > 0;

  return (
    <section aria-label="Conferência antes de fechar" className={`card-v2 space-y-3 p-4 ${blocked ? 'border-rose-300' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`flex items-center gap-2 text-sm font-semibold ${blocked ? 'text-rose-700' : totals.warnings ? 'text-amber-700' : 'text-emerald-700'}`}>
          {blocked || totals.warnings ? <AlertTriangle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          {blocked ? `${totals.blocking} funcionário(s) com pendência que trava o fechamento` : totals.warnings ? `${totals.warnings} funcionário(s) com avisos para conferir` : 'Ponto do mês conferido: nenhuma pendência.'}
        </p>
        <p className="text-xs text-fg-sub">Pagar o salário até {dateBr(data.salaryDeadline)} (5º dia útil, art. 459). Guardar os registros por 5 anos.</p>
        <Button variant="outline" size="sm" onClick={query.refetch}>Conferir de novo</Button>
      </div>
      {data.employees.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {data.employees.map((row) => {
            const hasBlock = row.issues.some((issue) => issue.severity === 'BLOCK');
            const isOpen = open === row.employeeId;
            return (
              <li key={row.employeeId}>
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : row.employeeId)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-sub">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{row.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${hasBlock ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{row.issues.length} {row.issues.length === 1 ? 'item' : 'itens'}</span>
                  <ChevronDown size={15} aria-hidden="true" className={isOpen ? 'rotate-180' : ''} />
                </button>
                {isOpen && (
                  <ul className="space-y-1 bg-bg-sub px-4 py-3 text-xs">
                    {row.issues.map((issue, index) => <li key={`${issue.code}-${index}`} className={issue.severity === 'BLOCK' ? 'font-semibold text-rose-700' : 'text-fg'}>{issue.severity === 'BLOCK' ? 'Trava: ' : ''}{issue.message}</li>)}
                    {row.breakDeficitMinutes > 0 && <li className="text-fg-sub">Intervalo suprimido no mês: {row.breakDeficitMinutes} min, pagos com 50% no fechamento.</li>}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {blocked && canForce && <p className="text-xs text-fg-sub">Resolva os ajustes com justificativa e ciência do gestor. Se precisar gerar assim mesmo, o sistema registra isso na auditoria: <button type="button" onClick={onForce} className="font-semibold text-rose-700 underline">gerar mesmo assim</button>.</p>}
    </section>
  );
}
