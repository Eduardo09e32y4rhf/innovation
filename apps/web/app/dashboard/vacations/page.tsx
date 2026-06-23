'use client';

import { useEffect, useState } from 'react';
import { Check, Plus, X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type CreateVacationInput, type Employee, type VacationStatus } from '@/app/lib/api';
import { VACATION_STATUS_LABEL, formatPeriod } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

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

  useEffect(() => {
    const id = window.setInterval(() => vacations.refetch(), 30000);
    return () => window.clearInterval(id);
  }, [vacations]);

  const pendingCount = rows.filter(row => row.status === 'PENDING').length;
  const approvedCount = rows.filter(row => row.status === 'APPROVED').length;
  const rejectedCount = rows.filter(row => row.status === 'REJECTED').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Premium Header */}
      <section className="group relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/30 to-teal-50/20 p-6 shadow-[0_20px_70px_-15px_rgba(15,23,42,0.12)] transition-all duration-500 hover:shadow-[0_25px_80px_-15px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-teal-100/40 to-cyan-100/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gradient-to-tr from-blue-100/30 to-teal-100/20 blur-2xl" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-1.5 shadow-sm">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">Férias</p>
            </div>
            <h1 className="mt-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-3xl font-black tracking-tight text-transparent lg:text-4xl">
              {isGestor ? 'Férias da equipe' : 'Solicitações'}
            </h1>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="crystal-button inline-flex h-11 items-center gap-2 rounded-[10px] bg-gradient-to-r from-teal-500 to-cyan-600 px-5 text-xs font-black text-white shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/30 active:translate-y-0"
          >
            <Plus size={15} strokeWidth={2.5} />
            Nova solicitação
          </button>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-[16px] border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-700">Pendentes</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{pendingCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <Clock size={20} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-[16px] border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Aprovadas</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{approvedCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <Check size={20} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-[16px] border border-rose-200/60 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-rose-700">Rejeitadas</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{rejectedCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25">
              <X size={20} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
      </section>

      {updateStatus.error && (
        <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-5 py-3 text-xs text-rose-700">{updateStatus.error}</p>
      )}

      {vacations.loading ? (
        <LoadingState label="Carregando solicitações..." />
      ) : vacations.error ? (
        <ErrorState message={vacations.error} onRetry={vacations.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhuma solicitação de férias registrada." />
      ) : (
        <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 to-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Período</th>
                  <th className="px-6 py-4">Dias</th>
                  <th className="px-6 py-4">Status</th>
                  {canApprove && <th className="px-6 py-4 text-right">Aprovação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const statusConfig = {
                    PENDING: 'bg-amber-50 text-amber-700 border-amber-200/60',
                    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
                    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200/60',
                  };
                  const statusClass = statusConfig[row.status] || 'bg-slate-50 text-slate-600 border-slate-200/60';
                  
                  return (
                    <tr key={row.id} className="group transition-all duration-200 hover:bg-slate-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white shadow-sm">
                            {row.employee?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <p className="text-sm font-black text-slate-950">{row.employee?.name ?? '—'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-semibold text-slate-700">{formatPeriod(row.startDate, row.endDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-900">
                          {row.daysUsed} {row.daysUsed === 1 ? 'dia' : 'dias'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-[8px] border px-3 py-1.5 text-[11px] font-black ${statusClass}`}>
                          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${row.status === 'PENDING' ? 'bg-amber-500' : row.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {VACATION_STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </td>
                      {canApprove && (
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => updateStatus.mutate({ id: row.id, status: 'APPROVED' }).catch(() => {})}
                              disabled={row.status !== 'PENDING' || updateStatus.loading}
                              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-[11px] font-black text-white shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/30 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                            >
                              <Check size={13} strokeWidth={2.5} />
                              Aprovar
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: row.id, status: 'REJECTED' }).catch(() => {})}
                              disabled={row.status !== 'PENDING' || updateStatus.loading}
                              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-rose-500 to-pink-600 px-4 text-[11px] font-black text-white shadow-md shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/30 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                            >
                              <X size={13} strokeWidth={2.5} />
                              Rejeitar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
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
  employees: Employee[];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[18px] border border-slate-200/60 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Nova solicitação de férias</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
        </div>

        {create.error && (
          <p className="mb-4 rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">{create.error}</p>
        )}

        <div className="space-y-4">
          <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Funcionário</span>
            <select
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            >
              <option value="">Selecione...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{employeeOptionLabel(emp)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Período aquisitivo</span>
            <input
              value={form.acquisitionPeriod}
              onChange={(e) => setForm((f) => ({ ...f, acquisitionPeriod: e.target.value }))}
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Início</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </label>
            <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Fim</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </label>
          </div>

          <div className="rounded-[10px] border border-teal-200/60 bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
            <p className="text-xs font-semibold text-slate-600">Total de dias</p>
            <p className="mt-1 text-lg font-black text-teal-700">{days} {days === 1 ? 'dia' : 'dias'}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline-premium h-10 rounded-[10px] px-5 text-xs font-black">Cancelar</button>
          <button
            onClick={() => valid && create.mutate().catch(() => {})}
            disabled={!valid || create.loading}
            className="crystal-button h-10 rounded-[10px] bg-gradient-to-r from-teal-500 to-cyan-600 px-5 text-xs font-black text-white shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/30 active:translate-y-0 disabled:opacity-60"
          >
            {create.loading ? 'Enviando...' : 'Solicitar'}
          </button>
        </div>
      </div>
    </div>
  );
}


function employeeOptionLabel(employee: Employee) {
  const registration = employee.registration || employee.id.slice(0, 8).toUpperCase();
  return `${normalizeDisplayName(employee.name)} - ${registration}`;
}

function vacationEmployeeLabel(employee: Employee | undefined, showCpf: boolean) {
  if (!employee) return '-';
  const registration = employee.registration || employee.id.slice(0, 8).toUpperCase();
  const cpf = showCpf ? ` | CPF: ${employee.cpf || '-'}` : '';
  return `${normalizeDisplayName(employee.name)} | Matrícula: ${registration}${cpf}`;
}