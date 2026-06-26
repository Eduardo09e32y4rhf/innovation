'use client';

import { useState } from 'react';
import { Calendar, CheckCircle2, RotateCcw, FileDown } from 'lucide-react';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';

export default function TimeClosingPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const isRhOrAdmin = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';


  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() + 1;
  });
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [reopenReason, setReopenReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery(() => api.timeClosing.list(), []);
  const periods = (listQuery.data ?? []) as any[];

  const generateMut = useMutation(({ referenceMonth, referenceYear }: { referenceMonth: number; referenceYear: number }) =>
    api.timeClosing.generate(referenceMonth, referenceYear)
  , { onSuccess: () => listQuery.refetch() });

  const closeMut = useMutation((id: string) => api.timeClosing.close(id), { onSuccess: () => listQuery.refetch() });
  const approveMut = useMutation((id: string) => api.timeClosing.approve(id), { onSuccess: () => listQuery.refetch() });
  const reopenMut = useMutation(({ id, reason }: { id: string; reason: string }) => api.timeClosing.reopen(id, reason), { onSuccess: () => { listQuery.refetch(); setReopenReason(''); setSelectedId(null); } });

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      OPEN: 'border-slate-200 bg-slate-50 text-slate-700',
      IN_ADJUSTMENT: 'border-amber-200 bg-amber-50 text-amber-700',
      PENDING_APPROVAL: 'border-blue-200 bg-blue-50 text-blue-700',
      APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      CLOSED: 'border-rose-200 bg-rose-50 text-rose-700',
      REOPENED: 'border-purple-200 bg-purple-50 text-purple-700',
      EXPORTED: 'border-teal-200 bg-teal-50 text-teal-700',
    };
    return <span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[9px] font-black ${map[status] ?? map.OPEN}`}>{status}</span>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">FOLHA DE PONTO</p>
          <h2 className="text-2xl font-black text-slate-950">Fechamento de Período</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Gerencie o fechamento mensal conforme as regras configuradas.</p>
        </div>
        {isRhOrAdmin && (
          <div className="flex gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-xs font-bold">
              {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{String(i+1).padStart(2,'0')}</option>)}
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 w-24 rounded-[8px] border border-slate-200 bg-white px-3 text-xs font-bold" />
            <button type="button" onClick={() => generateMut.mutate({ referenceMonth: month, referenceYear: year })} disabled={generateMut.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
              Gerar fechamento
            </button>
          </div>
        )}
      </header>

      {listQuery.loading && <LoadingState label="Carregando fechamentos..." />}
      {listQuery.error && <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />}
      {!listQuery.loading && !listQuery.error && periods.length === 0 && (
        <EmptyState message="Nenhum período de fechamento encontrado." />
      )}

      <div className="space-y-3">
        {periods.map((p) => (
          <div key={p.id} className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-950">{p.referenceMonth}/{p.referenceYear}</h3>
                  {statusBadge(p.status)}
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Período: {p.periodStart ? new Date(p.periodStart).toLocaleDateString('pt-BR') : '---'} a {p.periodEnd ? new Date(p.periodEnd).toLocaleDateString('pt-BR') : '---'}
                </p>
                {p.closedAt && <p className="mt-1 text-[11px] font-semibold text-slate-500">Fechado em: {new Date(p.closedAt).toLocaleString('pt-BR')}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.status === 'OPEN' && isRhOrAdmin && (
                  <button type="button" onClick={() => { setSelectedId(p.id); setReopenReason(''); }} className="btn-outline h-8 px-2.5 text-[10px] font-black">Fechar</button>
                )}
                {p.status === 'CLOSED' && isRhOrAdmin && (
                  <button type="button" onClick={() => { setSelectedId(p.id); setReopenReason(''); }} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-gradient-to-r from-amber-500 to-orange-600 px-2.5 text-[10px] font-black text-white"><RotateCcw size={12} /> Reabrir</button>
                )}
                {p.status === 'OPEN' && isRhOrAdmin && (
                  <button type="button" onClick={() => approveMut.mutate(p.id)} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 text-[10px] font-black text-white"><CheckCircle2 size={12} /> Aprovar</button>
                )}
              </div>
            </div>

            {selectedId === p.id && p.status === 'OPEN' && (
              <div className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-800">Confirmar fechamento do período?</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => closeMut.mutate(p.id)} disabled={closeMut.loading} className="inline-flex h-8 items-center rounded-[6px] bg-gradient-to-r from-rose-500 to-pink-600 px-3 text-[10px] font-black text-white">Confirmar fechamento</button>
                  <button type="button" onClick={() => setSelectedId(null)} className="btn-outline h-8 px-2.5 text-[10px] font-black">Cancelar</button>
                </div>
              </div>
            )}

            {selectedId === p.id && p.status === 'CLOSED' && (
              <div className="mt-3 rounded-[8px] border border-purple-200 bg-purple-50 p-3">
                <p className="text-xs font-bold text-purple-800">Informe o motivo da reabertura:</p>
                <textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} rows={2} className="mt-2 w-full rounded-[6px] border border-purple-200 bg-white px-3 py-2 text-xs" placeholder="Motivo..." />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => reopenMut.mutate({ id: p.id, reason: reopenReason })} disabled={reopenMut.loading || !reopenReason.trim()} className="inline-flex h-8 items-center rounded-[6px] bg-gradient-to-r from-purple-500 to-violet-600 px-3 text-[10px] font-black text-white disabled:opacity-60">Confirmar reabertura</button>
                  <button type="button" onClick={() => { setSelectedId(null); setReopenReason(''); }} className="btn-outline h-8 px-2.5 text-[10px] font-black">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}