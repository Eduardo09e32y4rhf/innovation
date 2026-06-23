'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, X, Calendar, Clock, AlertCircle, FileText, Download, History, RefreshCw, AlertTriangle } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type CreateVacationInput, type Employee, type VacationStatus } from '@/app/lib/api';
import { VACATION_STATUS_LABEL, formatPeriod, formatDate } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { buildPdfShell, section, field, grid3, signatures, printPdf, type PdfCompanyInfo } from '@/app/lib/pdf-utils';

const MAX_VACATION_DAYS = 30;

export default function VacationsPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canApprove = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH' || profile === 'GESTOR';
  const isGestor = profile === 'GESTOR';

  const vacations = useQuery(() => api.vacations.list(), []);
  const employees = useQuery(() => api.employees.list(), []);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const updateStatus = useMutation(
    ({ id, status }: { id: string; status: VacationStatus }) => api.vacations.updateStatus(id, status),
    { onSuccess: () => vacations.refetch() },
  );

  const rows = vacations.data ?? [];

  useEffect(() => {
    const id = window.setInterval(() => vacations.refetch(), 30000);
    return () => window.clearInterval(id);
  }, [vacations]);

  // Separate active vs history
  const activeRows = rows.filter(r => r.status === 'PENDING' || r.status === 'APPROVED');
  const historyRows = rows.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED' || r.status === 'COMPLETED');

  const pendingCount = rows.filter(row => row.status === 'PENDING').length;
  const approvedCount = rows.filter(row => row.status === 'APPROVED').length;
  const rejectedCount = rows.filter(row => row.status === 'REJECTED').length;
  const completedCount = rows.filter(row => row.status === 'COMPLETED').length;

  // Calculate used vacation days per employee
  const vacationDaysByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    rows
      .filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED')
      .forEach(r => {
        map.set(r.employeeId, (map.get(r.employeeId) || 0) + r.daysUsed);
      });
    return map;
  }, [rows]);

  // Detect period conflicts
  const activePeriods = useMemo(() => {
    return activeRows.map(r => ({
      employeeId: r.employeeId,
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      id: r.id,
    }));
  }, [activeRows]);

  function hasConflict(employeeId: string, startDate: string, endDate: string): { conflict: boolean; withName?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const conflict = activePeriods.find(p => 
      p.employeeId === employeeId &&
      start <= p.endDate && end >= p.startDate
    );
    if (conflict) {
      const emp = rows.find(r => r.id === conflict.id)?.employee;
      return { conflict: true, withName: emp?.name };
    }
    return { conflict: false };
  }

  function handleSelectAll() {
    if (selectedRows.length === activeRows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(activeRows.map(r => r.id));
    }
  }

  function handleSelect(id: string) {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function handleBulkApprove() {
    for (const id of selectedRows) {
      await updateStatus.mutate({ id, status: 'APPROVED' }).catch(() => {});
    }
    setSelectedRows([]);
  }

  function handleDownloadReceipt(row: typeof rows[0]) {
    downloadVacationReceipt(row);
  }

  const displayRows = tab === 'active' ? activeRows : historyRows;

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
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="Pendentes" value={pendingCount} icon={Clock} color="amber" />
        <StatCard label="Aprovadas" value={approvedCount} icon={Check} color="emerald" />
        <StatCard label="Concluídas" value={completedCount} icon={RefreshCw} color="teal" />
        <StatCard label="Rejeitadas" value={rejectedCount} icon={X} color="rose" />
      </section>

      {updateStatus.error && (
        <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-5 py-3 text-xs text-rose-700">{updateStatus.error}</p>
      )}

      {/* Tabs */}
      {!vacations.loading && !vacations.error && rows.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-[10px] bg-slate-100 p-1">
            <button onClick={() => setTab('active')} className={`rounded-[8px] px-4 py-2 text-xs font-black transition-all ${tab === 'active' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>
              Ativas ({activeRows.length})
            </button>
            <button onClick={() => setTab('history')} className={`rounded-[8px] px-4 py-2 text-xs font-black transition-all ${tab === 'history' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>
              Histórico ({historyRows.length})
            </button>
          </div>
          {/* Bulk actions */}
          {canApprove && tab === 'active' && selectedRows.length > 0 && (
            <div className="flex gap-2">
              <button onClick={handleBulkApprove} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-[11px] font-black text-white shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
                <Check size={13} strokeWidth={2.5} />
                Aprovar {selectedRows.length} selecionada(s)
              </button>
            </div>
          )}
        </div>
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
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 to-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                  {canApprove && tab === 'active' && <th className="px-4 py-4 w-10"><input type="checkbox" checked={selectedRows.length === activeRows.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" /></th>}
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Período</th>
                  <th className="px-6 py-4">Dias</th>
                  <th className="px-6 py-4">Saldo</th>
                  <th className="px-6 py-4">Período Aquisitivo</th>
                  <th className="px-6 py-4">Status</th>
                  {canApprove && tab === 'active' && <th className="px-6 py-4 text-right">Aprovação</th>}
                  {tab === 'history' && <th className="px-6 py-4 text-right">Recibo</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.map((row) => {
                  const statusColors: Record<string, string> = {
                    PENDING: 'bg-amber-50 text-amber-700 border-amber-200/60',
                    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
                    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200/60',
                    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200/60',
                    COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200/60',
                  };
                  const statusClass = statusColors[row.status] || 'bg-slate-50 text-slate-600 border-slate-200/60';
                  
                  // Balance calculation
                  const usedDays = vacationDaysByEmployee.get(row.employeeId) || 0;
                  const remaining = MAX_VACATION_DAYS - usedDays;
                  const conflict = tab === 'active' && row.status === 'PENDING' ? hasConflict(row.employeeId, row.startDate, row.endDate) : { conflict: false };

                  return (
                    <tr key={row.id} className={`group transition-all duration-200 hover:bg-slate-50/40 ${conflict.conflict ? 'bg-rose-50/30' : ''}`}>
                      {canApprove && tab === 'active' && (
                        <td className="px-4 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedRows.includes(row.id)} 
                            onChange={() => handleSelect(row.id)} 
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            disabled={row.status !== 'PENDING'}
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white shadow-sm">
                            {row.employee?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-950">{row.employee?.name ?? '—'}</p>
                            {conflict.conflict && (
                              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                                <AlertTriangle size={10} strokeWidth={2.5} />
                                Conflito: {conflict.withName}
                              </p>
                            )}
                          </div>
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
                          {row.daysUsed}d
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div 
                              className={`h-full rounded-full transition-all ${remaining >= 0 ? 'bg-teal-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min((usedDays / MAX_VACATION_DAYS) * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-black ${remaining >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                            {remaining}d restantes
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">{row.acquisitionPeriod}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-[8px] border px-3 py-1.5 text-[11px] font-black ${statusClass}`}>
                          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                            row.status === 'PENDING' ? 'bg-amber-500' : 
                            row.status === 'APPROVED' || row.status === 'COMPLETED' ? 'bg-emerald-500' : 
                            'bg-rose-500'
                          }`} />
                          {VACATION_STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </td>
                      {canApprove && tab === 'active' && (
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => updateStatus.mutate({ id: row.id, status: 'APPROVED' }).catch(() => {})}
                              disabled={row.status !== 'PENDING' || updateStatus.loading}
                              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-[11px] font-black text-white shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                            >
                              <Check size={13} strokeWidth={2.5} />
                              Aprovar
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: row.id, status: 'REJECTED' }).catch(() => {})}
                              disabled={row.status !== 'PENDING' || updateStatus.loading}
                              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-rose-500 to-pink-600 px-4 text-[11px] font-black text-white shadow-md shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                            >
                              <X size={13} strokeWidth={2.5} />
                              Rejeitar
                            </button>
                          </div>
                        </td>
                      )}
                      {tab === 'history' && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDownloadReceipt(row)}
                            className="btn-outline-premium inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[11px] font-black transition-all hover:-translate-y-0.5"
                          >
                            <FileText size={12} strokeWidth={2.5} />
                            Recibo
                          </button>
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
          existingVacations={rows}
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

// ─── STAT CARD ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/25',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    teal: 'from-teal-500 to-cyan-600 shadow-teal-500/25',
    rose: 'from-rose-500 to-pink-600 shadow-rose-500/25',
  };
  return (
    <div className="group relative overflow-hidden rounded-[16px] border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br ${colorMap[color]} shadow-lg`}>
          <Icon size={20} strokeWidth={2.5} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── PERIOD CONFLICT CHECK ─────────────────────────────────────────────────

function diffDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 86400000) + 1;
}

function NewVacationModal({
  employees, existingVacations, onClose, onDone,
}: {
  employees: Employee[];
  existingVacations: { employeeId: string; startDate: string; endDate: string; status: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    employeeId: '',
    acquisitionPeriod: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
    startDate: '',
    endDate: '',
  });
  const [observation, setObservation] = useState('');

  const days = diffDays(form.startDate, form.endDate);
  const daysUsed = existingVacations
    .filter(v => v.employeeId === form.employeeId && (v.status === 'APPROVED' || v.status === 'COMPLETED'))
    .reduce((sum, v) => sum + diffDays(v.startDate, v.endDate), 0);
  const remainingDays = MAX_VACATION_DAYS - daysUsed;
  const exceedsBalance = days > remainingDays;

  // Check conflict with existing active periods
  const conflict = existingVacations.find(v => 
    v.employeeId === form.employeeId && 
    v.status !== 'REJECTED' && v.status !== 'CANCELLED' &&
    new Date(form.startDate) <= new Date(v.endDate) && new Date(form.endDate) >= new Date(v.startDate)
  );
  const conflictMessage = conflict ? `Conflito: ${formatPeriod(conflict.startDate, conflict.endDate)} já registrado.` : null;

  const create = useMutation(
    () => {
      const payload: CreateVacationInput = {
        employeeId: form.employeeId,
        acquisitionPeriod: form.acquisitionPeriod,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        daysUsed: days,
        observation: observation || undefined,
      };
      return api.vacations.create(payload);
    },
    { onSuccess: onDone },
  );

  const valid = form.employeeId && form.startDate && form.endDate && days > 0 && !exceedsBalance && !conflictMessage;

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

          {form.employeeId && (
            <div className="rounded-[10px] border border-teal-200/60 bg-gradient-to-br from-teal-50 to-cyan-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Saldo de dias</p>
                <p className={`text-sm font-black ${remainingDays >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                  {daysUsed} usados / {remainingDays} restantes
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div 
                  className={`h-full rounded-full ${remainingDays >= 0 ? 'bg-teal-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min((daysUsed / MAX_VACATION_DAYS) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

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

          {conflictMessage && (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                <p className="text-xs font-semibold text-rose-700">{conflictMessage}</p>
              </div>
            </div>
          )}

          {exceedsBalance && (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                <p className="text-xs font-semibold text-rose-700">Saldo insuficiente: {days} dias solicitados, apenas {remainingDays} disponíveis.</p>
              </div>
            </div>
          )}

          <div className="rounded-[10px] border border-teal-200/60 bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
            <p className="text-xs font-semibold text-slate-600">Total de dias</p>
            <p className="mt-1 text-lg font-black text-teal-700">{days} {days === 1 ? 'dia' : 'dias'}</p>
          </div>

          <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Observação (opcional)</span>
            <input
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Motivo ou informação complementar"
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
          </label>
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

// ─── PDF RECEIPT ─────────────────────────────────────────────────────────────

function downloadVacationReceipt(vacation: { employee?: Employee; startDate: string; endDate: string; acquisitionPeriod: string; daysUsed: number; status: VacationStatus; observation?: string }) {
  const employee = vacation.employee;
  const companyInfo: PdfCompanyInfo | null = employee?.company
    ? {
        name: normalizeDisplayName(employee.company.name),
        document: employee.company.document ?? null,
        logoUrl: employee.company.logoUrl ?? null,
      }
    : null;

  const title = 'Recibo de Férias';
  const subtitle = VACATION_STATUS_LABEL[vacation.status] || vacation.status;

  const body = `
    ${section('Dados do Colaborador', grid3([
      field('Nome', normalizeDisplayName(employee?.name || '—')),
      field('Matrícula', employee?.registration || (employee?.id ? employee.id.slice(0, 8).toUpperCase() : '-')),
      field('CPF', employee?.cpf || '-'),
      field('Departamento', employee?.department || '-'),
      field('Cargo', employee?.position || '-'),
      field('Admissão', formatDate(employee?.admissionDate)),
    ]))}

    ${section('Período de Férias', `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-bottom:16px;">
        ${field('Início', formatDate(vacation.startDate))}
        ${field('Fim', formatDate(vacation.endDate))}
        ${field('Período Aquisitivo', vacation.acquisitionPeriod)}
      </div>
      <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:24px;text-align:center;margin-top:12px;">
        <div style="font-size:40px;font-weight:900;color:#0f172a;">${vacation.daysUsed}</div>
        <div style="font-size:10px;font-weight:900;color:#0f766e;text-transform:uppercase;letter-spacing:0.1em;margin-top:6px;">${vacation.daysUsed === 1 ? 'Dia de Férias' : 'Dias de Férias'}</div>
      </div>
      ${vacation.observation ? `<div style="background:#f8fafc;padding:12px;border-radius:8px;font-size:9px;color:#475569;margin-top:12px;"><strong>Observação:</strong> ${escapeHtml(vacation.observation)}</div>` : ''}
    `)}
  `;

  const html = buildPdfShell({ title, subtitle, landscape: false }, companyInfo, body + signatures(['Assinatura do Colaborador', 'Assinatura do RH / Responsável', 'Data de Conferência']));
  printPdf(html, `recibo-ferias-${slugify(employee?.name || 'funcionario')}.pdf`);
}

// ─── PDF UTILITIES ───────────────────────────────────────────────────────────

function employeeOptionLabel(employee: Employee) {
  const registration = employee.registration || employee.id.slice(0, 8).toUpperCase();
  return `${normalizeDisplayName(employee.name)} - ${registration}`;
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'documento';
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&', '<': '<', '>': '>', '"': '"' }[char] ?? char));
}