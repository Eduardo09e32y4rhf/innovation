'use client';

import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type CreateVacationInput, type VacationStatus } from '@/app/lib/api';
import { VACATION_STATUS_LABEL, formatPeriod } from '@/app/lib/format';

export default function VacationsPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canApprove = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH' || profile === 'GESTOR';
  const isGestor = profile === 'GESTOR';

  const vacations = useQuery(() => api.vacations.list(), []);
  const employees = useQuery(() => api.employees.list(), []);
  const [open, setOpen] = useState(false);

  const updateStatus = useMutation(
    ({ id, status }: { id: string; status: VacationStatus }) => api.vacations.updateStatus(id, status),
    { onSuccess: () => vacations.refetch() },
  );

  const rows = vacations.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Férias</p>
          <h2 className="text-2xl font-black text-slate-950">{isGestor ? 'Ferias da equipe' : 'Solicitacoes'}</h2>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"
        >
          <Plus size={14} />
          Nova solicitacao
        </button>
      </header>

      {updateStatus.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{updateStatus.error}</p>
      )}

      {vacations.loading ? (
        <LoadingState label="Carregando solicitacoes..." />
      ) : vacations.error ? (
        <ErrorState message={vacations.error} onRetry={vacations.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhuma solicitacao de ferias registrada." />
      ) : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Funcionário</th>
                  <th className="pb-3 pr-4">Período</th>
                  <th className="pb-3 pr-4">Dias</th>
                  <th className="pb-3 pr-4">Status</th>
                  {canApprove && <th className="pb-3">Aprovacao</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-xs text-slate-700">
                    <td className="py-3 pr-4 font-medium text-slate-950">{row.employee?.name ?? '—'}</td>
                    <td className="py-3 pr-4">{formatPeriod(row.startDate, row.endDate)}</td>
                    <td className="py-3 pr-4">{row.daysUsed}</td>
                    <td className="py-3 pr-4">{VACATION_STATUS_LABEL[row.status] ?? row.status}</td>
                    {canApprove && (
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus.mutate({ id: row.id, status: 'APPROVED' }).catch(() => {})}
                            disabled={row.status !== 'PENDING' || updateStatus.loading}
                            className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] disabled:opacity-40"
                          >
                            <Check size={12} />Aprovar
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ id: row.id, status: 'REJECTED' }).catch(() => {})}
                            disabled={row.status !== 'PENDING' || updateStatus.loading}
                            className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] disabled:opacity-40"
                          >
                            <X size={12} />Rejeitar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <NewVacationModal
          employees={employees.data ?? []}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            vacations.refetch();
          }}
        />
      )}
    </div>
  );
}

function diffDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 86400000) + 1;
}

function NewVacationModal({
  employees, onClose, onDone,
}: {
  employees: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    employeeId: '',
    acquisitionPeriod: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
    startDate: '',
    endDate: '',
  });

  const days = diffDays(form.startDate, form.endDate);

  const create = useMutation(
    () => {
      const payload: CreateVacationInput = {
        employeeId: form.employeeId,
        acquisitionPeriod: form.acquisitionPeriod,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        daysUsed: days,
      };
      return api.vacations.create(payload);
    },
    { onSuccess: onDone },
  );

  const valid = form.employeeId && form.startDate && form.endDate && days > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Nova solicitacao de ferias</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {create.error && (
          <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{create.error}</p>
        )}

        <label className="mb-3 block space-y-1 text-xs font-medium text-slate-600">
          <span>Funcionário</span>
          <select
            value={form.employeeId}
            onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
            className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="">Selecione...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </label>

        <label className="mb-3 block space-y-1 text-xs font-medium text-slate-600">
          <span>Período aquisitivo</span>
          <input
            value={form.acquisitionPeriod}
            onChange={(e) => setForm((f) => ({ ...f, acquisitionPeriod: e.target.value }))}
            className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
          />
        </label>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Inicio</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Fim</span>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
            />
          </label>
        </div>

        <p className="mb-5 text-xs text-slate-500">Total: <strong className="text-slate-900">{days} dia(s)</strong></p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button
            onClick={() => valid && create.mutate().catch(() => {})}
            disabled={!valid || create.loading}
            className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            {create.loading ? 'Enviando...' : 'Solicitar'}
          </button>
        </div>
      </div>
    </div>
  );
}
