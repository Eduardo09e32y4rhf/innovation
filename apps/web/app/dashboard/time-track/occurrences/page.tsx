'use client';

import { useState } from 'react';
import { Check, X, Eye, Filter } from 'lucide-react';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

export default function TimeOccurrencesPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const isRhOrAdmin = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';


  const [filter, setFilter] = useState<FilterType>('all');

  const listQuery = useQuery(() => api.timeOccurrences.list(), []);
  const occurrences = (listQuery.data ?? []) as any[];

  const approveMut = useMutation((id: string) => api.timeOccurrences.approve(id), {
    onSuccess: () => listQuery.refetch(),
  });
  const rejectMut = useMutation((id: string) => api.timeOccurrences.reject(id), {
    onSuccess: () => listQuery.refetch(),
  });

  const filtered = occurrences.filter((o) => {
    if (filter === 'pending') return o.status === 'PENDING';
    if (filter === 'approved') return o.status === 'APPROVED';
    if (filter === 'rejected') return o.status === 'REJECTED';
    return true;
  });

  function typeLabel(type: string) {
    const map: Record<string, string> = {
      LATE_ARRIVAL: 'Atraso',
      EARLY_LEAVE: 'Saída antecipada',
      ABSENCE: 'Falta',
      JUSTIFIED_ABSENCE: 'Falta justificada',
      UNJUSTIFIED_ABSENCE: 'Falta injustificada',
      MEDICAL_CERTIFICATE: 'Atestado',
      MANUAL_ADJUSTMENT: 'Ajuste manual',
      MISSING_PUNCH: 'Ponto incompleto',
      OVERTIME: 'Hora extra',
      NEGATIVE_BALANCE: 'Banco negativo',
      POSITIVE_BALANCE: 'Banco positivo',
      DAY_OFF: 'Folga',
      DSR: 'DSR',
      HOLIDAY: 'Feriado',
      VACATION: 'Férias',
      LEAVE: 'Licença',
      EXTERNAL_WORK: 'Serviço externo',
      HOME_OFFICE: 'Home office',
      TRAINING: 'Treinamento',
    };
    return map[type] ?? type;
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
      APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
    };
    return <span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[9px] font-black ${map[status] ?? map.PENDING}`}>{status}</span>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">PONTO</p>
          <h2 className="text-2xl font-black text-slate-950">Ocorrências</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Acompanhe e gerencie ocorrências de ponto.</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Todas</FilterButton>
        <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')}>Pendentes</FilterButton>
        <FilterButton active={filter === 'approved'} onClick={() => setFilter('approved')}>Aprovadas</FilterButton>
        <FilterButton active={filter === 'rejected'} onClick={() => setFilter('rejected')}>Recusadas</FilterButton>
      </div>

      {listQuery.loading && <LoadingState label="Carregando ocorrências..." />}
      {listQuery.error && <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />}
      {!listQuery.loading && !listQuery.error && filtered.length === 0 && (
        <EmptyState message="Nenhuma ocorrência encontrada." />
      )}

      <div className="space-y-3">
        {filtered.map((o) => (
          <div key={o.id} className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-950">{typeLabel(o.type)}</h3>
                  {statusBadge(o.status)}
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-600">Data: {new Date(o.date).toLocaleDateString('pt-BR')} | Duração: {o.minutes}min</p>
                {o.reason && <p className="mt-1 text-[11px] font-semibold text-slate-500">Motivo: {o.reason}</p>}
                {o.observation && <p className="mt-1 text-[11px] font-semibold text-slate-500">Obs: {o.observation}</p>}
              </div>
              <div className="flex gap-1.5">
                {o.status === 'PENDING' && isRhOrAdmin && (
                  <>
                    <button type="button" onClick={() => approveMut.mutate(o.id)} disabled={approveMut.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 text-[10px] font-black text-white"><Check size={12} /> Aprovar</button>
                    <button type="button" onClick={() => rejectMut.mutate(o.id)} disabled={rejectMut.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-gradient-to-r from-rose-500 to-pink-600 px-2.5 text-[10px] font-black text-white"><X size={12} /> Recusar</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-[6px] px-3 text-[11px] font-black transition-all ${
        active ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-500'
      }`}
    >
      {children}
    </button>
  );
}