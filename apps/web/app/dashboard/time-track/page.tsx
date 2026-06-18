'use client';

import { useState } from 'react';
import { Clock3, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type PunchType } from '@/app/lib/api';
import { formatDate, formatMinutes, formatTime } from '@/app/lib/format';

const PUNCH_OPTIONS: { value: PunchType; label: string }[] = [
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'LUNCH_START', label: 'Saida almoco' },
  { value: 'LUNCH_RETURN', label: 'Retorno almoco' },
  { value: 'EXIT', label: 'Saida' },
];

export default function TimeTrackPage() {
  const tracks = useQuery(() => api.timeTrack.list(), []);
  const employees = useQuery(() => api.employees.list(), []);
  const [open, setOpen] = useState(false);

  const rows = tracks.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Controle de ponto</p>
          <h2 className="text-2xl font-black text-slate-950">Registros do mes</h2>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"
        >
          <Clock3 size={14} />
          Registrar ponto
        </button>
      </header>

      {tracks.loading ? (
        <LoadingState label="Carregando registros de ponto..." />
      ) : tracks.error ? (
        <ErrorState message={tracks.error} onRetry={tracks.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhum registro de ponto neste periodo." />
      ) : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Funcionario</th>
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Entrada</th>
                  <th className="pb-3 pr-4">Almoco</th>
                  <th className="pb-3 pr-4">Saida</th>
                  <th className="pb-3 pr-4">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-xs text-slate-700">
                    <td className="py-3 pr-4 font-medium text-slate-950">{row.employee?.name ?? '—'}</td>
                    <td className="py-3 pr-4">{formatDate(row.date)}</td>
                    <td className="py-3 pr-4">{formatTime(row.entry)}</td>
                    <td className="py-3 pr-4">
                      {formatTime(row.lunchStart)} - {formatTime(row.lunchReturn)}
                    </td>
                    <td className="py-3 pr-4">{formatTime(row.exit)}</td>
                    <td className={`py-3 pr-4 font-medium ${(row.dailyBalance ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatMinutes(row.dailyBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <RegisterModal
          employees={(employees.data ?? []).filter((employee) => employee.status === 'ACTIVE')}
          employeesLoading={employees.loading}
          employeesError={employees.error}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            tracks.refetch();
          }}
        />
      )}
    </div>
  );
}

function RegisterModal({
  employees, employeesLoading, employeesError, onClose, onDone,
}: {
  employees: { id: string; name: string }[];
  employeesLoading: boolean;
  employeesError: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<PunchType>('ENTRY');

  const register = useMutation(
    () => api.timeTrack.register({ employeeId, type }),
    { onSuccess: onDone },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Registrar ponto</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {(register.error || employeesError) && (
          <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {register.error || employeesError}
          </p>
        )}

        <label className="mb-3 block space-y-1 text-xs font-medium text-slate-600">
          <span>Funcionario</span>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="">{employeesLoading ? 'Carregando equipe...' : 'Selecione...'}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </label>

        {!employeesLoading && employees.length === 0 ? (
          <p className="mb-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            Cadastre um funcionario ativo antes de registrar o ponto.
          </p>
        ) : null}

        <label className="mb-5 block space-y-1 text-xs font-medium text-slate-600">
          <span>Tipo de marcacao</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PunchType)}
            className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
          >
            {PUNCH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button
            onClick={() => employeeId && register.mutate().catch(() => {})}
            disabled={!employeeId || employees.length === 0 || register.loading}
            className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            {register.loading ? 'Registrando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
