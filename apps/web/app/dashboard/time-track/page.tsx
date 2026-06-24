'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Clock3, Edit3, Eye, FileText, Trash2, X, XCircle, Gift, Ban, CalendarDays, Umbrella, Coffee } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Company, type Employee, type TimeTrack, type RestDayMode, type TimeTrackAdjustmentReason } from '@/app/lib/api';
import { formatDate, formatMinutes } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

const WEEKDAYS = [
  { value: 0, label: 'DOM' },
  { value: 1, label: 'SEG' },
  { value: 2, label: 'TER' },
  { value: 3, label: 'QUA' },
  { value: 4, label: 'QUI' },
  { value: 5, label: 'SEX' },
  { value: 6, label: 'SÁB' },
];

function defaultDaysOff(workScale?: string | null) {
  if (workScale === '5X2') return [0, 6];
  if (workScale === '6X1') return [0];
  return [];
}

function defaultCycle(workScale?: string | null) {
  if (workScale === '6X1') return { workDays: 6, offDays: 1 };
  if (workScale === '5X2') return { workDays: 5, offDays: 2 };
  if (workScale === '12X36') return { workDays: 1, offDays: 1 };
  if (workScale === '4X2') return { workDays: 4, offDays: 2 };
  return { workDays: 6, offDays: 1 };
}

const ADJUSTMENT_REASONS: { value: TimeTrackAdjustmentReason; label: string; fullDay?: boolean; }[] = [
  { value: 'ajuste_erro_marcacao', label: 'Ajuste - erro de marcação' },
  { value: 'ajuste_atestado_integral', label: 'Atestado integral', fullDay: true },
  { value: 'ajuste_feriado', label: 'Feriado', fullDay: true },
  { value: 'ajuste_abono_atestado_horas', label: 'Abono - atestado de horas' },
  { value: 'ajuste_folga_dsr', label: 'Folga' },
  { value: 'ajuste_abono_folga', label: 'Abono - folga (banco)' },
];

type CompanyPrintInfo = { name: string; document: string; logoUrl?: string | null };

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function toDateKey(value?: string | null) { return value ? value.slice(0, 10) : ''; }

function displayTime(value?: string | null) {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function timeInput(value?: string | null) { return displayTime(value) === '--:--' ? '' : displayTime(value); }
function displayWorked(minutes?: number | null) { return minutes === null || minutes === undefined ? '--:--' : formatMinutes(minutes); }
function displayBalance(minutes?: number | null) { return minutes === null || minutes === undefined ? '--:--' : formatMinutes(minutes); }
function displayLunch(start?: string | null, end?: string | null) { if (!start && !end) return '--:--'; return `${displayTime(start)} - ${displayTime(end)}`; }

function formatDateFull(value?: string | null): string {
  if (!value) return '---';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '---';
  const weekday = WEEKDAYS[d.getUTCDay()]?.label ?? '---';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${weekday} - ${day}/${month}/${year}`;
}

// ─── MONTH GRID & REST DAYS ───────────────────────────────────────────────

interface DaySlot {
  date: Date; dateKey: string; dayNumber: number; weekday: number;
  weekdayLabel: string; isRestDay: boolean; isFuture: boolean; track?: TimeTrack;
}

function daysInMonth(year: number, month: number) { return new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); }

function isEmployeeRestDay(date: Date, employee: Employee): boolean {
  const weekday = date.getUTCDay();
  const scale = employee.workScale;
  const custom = employee.customWorkScale;
  if (scale === '5X2') return weekday === 0 || weekday === 6;
  if (scale === '6X1') return weekday === 0;
  if (scale === '4X2') return isCycleRestDay(date, employee, 4, 2);
  if (scale === '12X36') return isCycleRestDay(date, employee, 1, 1);
  if (scale === 'OUTRO' && custom) {
    const match = custom.match(/(\d+)X(\d+)/i);
    if (match) return isCycleRestDay(date, employee, parseInt(match[1], 10), parseInt(match[2], 10));
    return weekday === 0 || weekday === 6;
  }
  return weekday === 0;
}

function isCycleRestDay(date: Date, employee: Employee, workDays: number, offDays: number): boolean {
  const admission = employee.admissionDate ? new Date(employee.admissionDate) : new Date('2020-01-01');
  const admissionUtc = Date.UTC(admission.getUTCFullYear(), admission.getUTCMonth(), admission.getUTCDate());
  const dateUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diffDays = Math.floor((dateUtc - admissionUtc) / 86400000);
  if (diffDays < 0) return false;
  return (diffDays % (workDays + offDays)) >= workDays;
}

function generateMonthGrid(monthStr: string, employee: Employee, tracks: TimeTrack[]): DaySlot[] {
  const [year, month] = monthStr.split('-').map(Number);
  const totalDays = daysInMonth(year, month - 1);
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const trackMap = new Map<string, TimeTrack>();
  for (const t of tracks) trackMap.set(toDateKey(t.date), t);
  const grid: DaySlot[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const dateKey = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    grid.push({ date, dateKey, dayNumber: day, weekday, weekdayLabel: WEEKDAYS[weekday]?.label ?? '---', isRestDay: isEmployeeRestDay(date, employee), isFuture: dateKey > todayKey, track: trackMap.get(dateKey) });
  }
  return grid;
}

function restDayBadge(reason?: string) { return reason || 'FOLGA (DSR)'; }

function toIso(date: string, time: string) {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function normalizeCompanyInfo(company?: Company | null): CompanyPrintInfo {
  return { name: normalizeDisplayName(company?.name ?? 'Empresa'), document: company?.document?.replace(/\D/g, '') ?? '', logoUrl: company?.logoUrl ?? null };
}

function monthLabel(month: string) {
  if (!month) return 'Todos os períodos';
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  const date = new Date(year, monthNumber - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());
}

function dayStatus(row: TimeTrack): string {
  if (row.manualStatus === 'revoked') return 'REVOGADO';
  const obs = (row.observation ?? '').toLowerCase();
  if (obs.includes('atestado integral')) return 'ATESTADO';
  if (obs.includes('atestado') && obs.includes('horas')) return 'ATESTADO (HORAS)';
  if (obs.includes('suspensao') || obs.includes('suspensão')) return 'SUSPENSÃO';
  if (obs.includes('folga extra')) return 'FOLGA EXTRA';
  if (obs.includes('folga banco')) return 'FOLGA BANCO';
  if (obs.includes('feriado')) return 'FERIADO';
  if (obs.includes('folga')) return 'FOLGA';
  const reason = (row.manualReason ?? '').toLowerCase();
  if (reason.includes('atestado integral')) return 'ATESTADO';
  if (reason.includes('feriado')) return 'FERIADO';
  if (reason.includes('folga') && reason.includes('dsr')) return 'FOLGA';
  if (row.manualStatus === 'pending') return 'PENDENTE';
  if (row.manualStatus === 'rejected') return 'REJEITADO';
  if (row.manualReason || obs.includes('ajuste')) return 'AJUSTE MANUAL';
  if (!row.entry && !row.exit) return 'FALTA';
  return 'NORMAL';
}

function isFalta(row: TimeTrack): boolean {
  if (row.entry || row.exit) return false;
  const obs = (row.observation ?? '').toLowerCase();
  if (obs.includes('atestado') || obs.includes('feriado') || obs.includes('folga')) return false;
  return true;
}

function sumMinutes(rows: TimeTrack[], field: 'totalWorked' | 'dailyBalance') { return rows.reduce((total, row) => total + (row[field] ?? 0), 0); }

function openPrintableReport(rows: TimeTrack[], month: string, company: CompanyPrintInfo, employee?: Employee) {
  const title = employee ? `Espelho individual - ${normalizeDisplayName(employee.name)} - ${monthLabel(month)}` : `Espelho da empresa - ${monthLabel(month)}`;
  const win = window.open('', '_blank');
  if (!win) { window.alert('Não foi possível abrir o relatório.'); return; }
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${title}</title></head><body><h1>${title}</h1></body></html>`);
  win.document.close();
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────

export default function TimeTrackPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';
  const canApprove = canManage || profile === 'GESTOR';
  const isFuncionario = profile === 'FUNCIONARIO';
  const isGestor = profile === 'GESTOR';

  const tracks = useQuery(() => api.timeTrack.list(), []);
  const employees = useQuery(() => api.employees.list(), [], { enabled: !isFuncionario });
  const company = useQuery(() => api.companies.me(), [], { enabled: canManage || isGestor });
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<TimeTrack | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [tab, setTab] = useState<'ponto' | 'ocorrencias'>('ponto');

  const activeEmployees = useMemo(() => (employees.data ?? []).filter(e => e.status === 'ACTIVE').toSorted((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name))), [employees.data]);
  const departments = useMemo(() => [...new Set((employees.data ?? []).map(e => e.department).filter(Boolean))].sort(), [employees.data]);
  const managers = useMemo(() => (employees.data ?? []).filter(e => (employees.data ?? []).some(sub => sub.managerId === e.id)).toSorted((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name))), [employees.data]);
  const units = useMemo(() => [...new Set((employees.data ?? []).map(e => e.unit).filter(Boolean))].sort() as string[], [employees.data]);

  const rows = useMemo(() => (tracks.data ?? []).filter(row => {
    if (employeeFilter && row.employeeId !== employeeFilter) return false;
    if (monthFilter && !toDateKey(row.date).startsWith(monthFilter)) return false;
    if (departmentFilter && row.employee?.department !== departmentFilter) return false;
    if (managerFilter && row.employee?.managerId !== managerFilter) return false;
    if (unitFilter && row.employee?.unit !== unitFilter) return false;
    return true;
  }).toSorted((a, b) => toDateKey(a.date).localeCompare(toDateKey(b.date))), [tracks.data, employeeFilter, monthFilter, departmentFilter, managerFilter, unitFilter]);

  const selectedEmployee = activeEmployees.find(e => e.id === employeeFilter);
  const rowsByEmployee = useMemo(() => rows.reduce<Record<string, TimeTrack[]>>((acc, row) => { acc[row.employeeId] = acc[row.employeeId] ?? []; acc[row.employeeId].push(row); return acc; }, {}), [rows]);
  const visibleEmployees = useMemo(() => activeEmployees.filter(e => {
    if (employeeFilter && e.id !== employeeFilter) return false;
    if (departmentFilter && e.department !== departmentFilter) return false;
    if (managerFilter && e.managerId !== managerFilter) return false;
    if (unitFilter && e.unit !== unitFilter) return false;
    return true;
  }), [activeEmployees, employeeFilter, departmentFilter, managerFilter, unitFilter]);
  const reportCompany = useMemo(() => normalizeCompanyInfo(isFuncionario ? null : company.data), [company.data, isFuncionario]);
  const remove = useMutation((id: string) => api.timeTrack.delete(id), { onSuccess: () => tracks.refetch() });

  const canClockIn = Boolean(profile && !['DEV', 'COMERCIAL', 'CONSULTA'].includes(profile));
  const pendingTracks = useQuery(() => api.timeTrack.listPending(), [], { enabled: canApprove });
  const approveMutation = useMutation((params: { id: string; approved: boolean }) => api.timeTrack.approve(params.id, params.approved), { onSuccess: () => { pendingTracks.refetch(); tracks.refetch(); } });

  useEffect(() => { const id = window.setInterval(() => { tracks.refetch(); if (canApprove) pendingTracks.refetch(); }, 30000); return () => window.clearInterval(id); }, [tracks, pendingTracks, canApprove]);

  async function handleDelete(row: TimeTrack) {
    const employeeName = normalizeDisplayName(row.employee?.name ?? 'funcionário');
    if (!window.confirm(`Excluir o ponto de ${employeeName} em ${formatDateFull(row.date)}?`)) return;
    await remove.mutate(row.id).catch(() => {});
  }

  const pageTitle = isFuncionario ? 'MEU PONTO' : isGestor ? 'PONTO DA EQUIPE' : 'FOLHA DE PONTO';
  const isInitialTracksLoading = tracks.loading && !tracks.data;
  const isRefreshingTracks = tracks.loading && Boolean(tracks.data);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">CONTROLE DE PONTO</p>
          <h2 className="text-2xl font-black text-slate-950">{pageTitle}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {canClockIn && <Link href="/dashboard/time-track/clock-in" className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"><Clock3 size={14} /> BATER PONTO</Link>}
          {(canManage || isGestor) && <button onClick={() => setBulkOpen(true)} disabled={isRefreshingTracks} className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black"><Clock3 size={14} /> LANÇAR EM LOTE</button>}
          {canManage && <button onClick={() => setOpen(true)} disabled={isRefreshingTracks} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"><Edit3 size={14} /> LANÇAR PONTO</button>}
        </div>
      </header>

      {/* Pending approvals */}
      {canApprove && (pendingTracks.data ?? []).length > 0 && (
        <section className="rounded-[12px] border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-3 text-sm font-black text-amber-900">PONTOS PENDENTES DE APROVAÇÃO ({(pendingTracks.data ?? []).length})</h3>
          {approveMutation.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{approveMutation.error}</p>}
          <div className="space-y-2">{(pendingTracks.data ?? []).map(track => (
            <div key={track.id} className="flex items-center justify-between rounded-[8px] border border-amber-200 bg-white px-4 py-3">
              <div className="text-xs"><p className="font-bold text-slate-950">{normalizeDisplayName(track.employee?.name ?? '-')}</p><p className="text-slate-500">{formatDateFull(track.date)} - {track.manualReason ?? 'Lancamento manual'}</p></div>
              <div className="flex gap-2">
                <button onClick={() => approveMutation.mutate({ id: track.id, approved: true }).catch(() => {})} disabled={approveMutation.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-60"><Check size={12} />APROVAR</button>
                <button onClick={() => approveMutation.mutate({ id: track.id, approved: false }).catch(() => {})} disabled={approveMutation.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-rose-600 px-3 text-[11px] font-bold text-white disabled:opacity-60"><XCircle size={12} />RECUSAR</button>
              </div>
            </div>))}
          </div>
        </section>
      )}

      {/* Tabs + Filters */}
      {!isFuncionario && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-[8px] bg-slate-100 p-1">
            <button onClick={() => setTab('ponto')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab === 'ponto' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>Ponto</button>
            <button onClick={() => setTab('ocorrencias')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab === 'ocorrencias' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>Ocorrências</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
              <option value="">TODOS</option>
              {activeEmployees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
            </select>
            <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-9 w-36 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500" />
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
              <option value="">DEPTO</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      )}

      {isFuncionario && (
        <div className="flex flex-wrap items-center gap-3">
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-9 w-36 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500" />
        </div>
      )}

      {remove.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{remove.error}</p>}
      {isRefreshingTracks && <p className="rounded-[8px] border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700">Atualizando...</p>}

      {/* Content */}
      {isInitialTracksLoading ? <LoadingState label="Carregando folha de ponto..." /> : tracks.error && !tracks.data ? <ErrorState message={tracks.error} onRetry={tracks.refetch} /> : (employeeFilter || isFuncionario) && selectedEmployee ? (
        tab === 'ponto' ? (
          <MonthGridSection 
            employee={selectedEmployee} 
            tracks={rowsByEmployee[selectedEmployee.id] ?? []} 
            monthFilter={monthFilter} 
            canManage={canManage}
            canApprove={canApprove}
            isRefreshing={isRefreshingTracks} 
            removeLoading={remove.loading} 
            onEdit={setEditing} 
            onDelete={handleDelete} 
            canDownload={canManage || isGestor || isFuncionario} 
            reportCompany={reportCompany} 
            companyLoading={company.loading} 
          />
        ) : (
          <OcorrenciasSection
            employee={selectedEmployee}
            tracks={rowsByEmployee[selectedEmployee.id] ?? []}
            monthFilter={monthFilter}
            canManage={canManage}
            canApprove={canApprove}
            isRefreshing={isRefreshingTracks}
            removeLoading={remove.loading}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        )
      ) : visibleEmployees.length === 0 ? <EmptyState message="Nenhum colaborador encontrado." /> : tab === 'ponto' ? (
        <section className="overflow-hidden rounded-[14px] border border-slate-200/60 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4"><h3 className="text-sm font-black text-slate-950">COLABORADORES</h3><p className="mt-1 text-xs text-slate-500">Selecione para abrir a folha mensal completa.</p></div>
          <div className="divide-y divide-slate-100">
            {visibleEmployees.map(employee => {
              const employeeRows = rowsByEmployee[employee.id] ?? [];
              const workedTotal = sumMinutes(employeeRows, 'totalWorked');
              const balanceTotal = sumMinutes(employeeRows, 'dailyBalance');
              const grid = generateMonthGrid(monthFilter, employee, employeeRows);
              const restDaysCount = grid.filter(d => d.isRestDay).length;
              const workedDaysCount = grid.filter(d => d.track && !d.isRestDay).length;
              const faltas = employeeRows.filter(r => isFalta(r)).length;
              return (
                <div key={employee.id} className="bg-white px-5 py-4 transition-all duration-200 hover:bg-slate-50/40">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white">{normalizeDisplayName(employee.name).charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-teal-200/60 bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700">{employee.registration || employee.id.slice(0, 8).toUpperCase()}</span>
                          <p className="text-sm font-black text-slate-950">{normalizeDisplayName(employee.name)}</p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                          <span>{workedDaysCount} BATIDA(S)</span><span className="text-slate-300">|</span>
                          <span>{restDaysCount} FOLGA(S)</span><span className="text-slate-300">|</span>
                          {faltas > 0 && <><span className="text-rose-600">{faltas} FALTA(S)</span><span className="text-slate-300">|</span></>}
                          <span>{employee.department || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex gap-2 text-[10px] font-bold">
                        <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-2.5 py-1"><span className="block text-[8px] uppercase text-slate-400">TRAB</span><span className="text-slate-900">{formatMinutes(workedTotal)}</span></div>
                        <div className={`rounded-[6px] border px-2.5 py-1 ${balanceTotal >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><span className="block text-[8px] uppercase text-slate-400">SALDO</span><span className={balanceTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatMinutes(balanceTotal)}</span></div>
                      </div>
                      <button onClick={() => setEmployeeFilter(employee.id)} className="btn-outline-premium inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[10px] font-black"><Eye size={12} /> ABRIR</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <OcorrenciasList employees={visibleEmployees} rowsByEmployee={rowsByEmployee} monthFilter={monthFilter} onSelectEmployee={setEmployeeFilter} />
      )}

      {(open || bulkOpen || editing) && <ManualTimeSheetModal employees={activeEmployees} employeesLoading={employees.loading} employeesError={employees.error} defaultEmployeeId={employeeFilter} track={editing ?? undefined} bulk={bulkOpen} onClose={() => { setOpen(false); setBulkOpen(false); setEditing(null); }} onDone={() => { setOpen(false); setBulkOpen(false); setEditing(null); tracks.refetch(); }} />}
    </div>
  );
}

// ─── OCORRENCIAS LIST ─────────────────────────────────────────────────────

function OcorrenciasList({ employees, rowsByEmployee, monthFilter, onSelectEmployee }: { employees: Employee[]; rowsByEmployee: Record<string, TimeTrack[]>; monthFilter: string; onSelectEmployee: (id: string) => void }) {
  const employeesWithIssues = employees.filter(e => {
    const tracks = rowsByEmployee[e.id] ?? [];
    return tracks.some(t => isFalta(t));
  });
  if (employeesWithIssues.length === 0) return <EmptyState message="Nenhuma ocorrência registrada no mês." />;
  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200/60 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-amber-50/50 px-5 py-4"><h3 className="text-sm font-black text-amber-900">OCORRÊNCIAS DO MÊS</h3><p className="mt-1 text-xs text-amber-700">Atrasos, faltas e saídas antecipadas.</p></div>
      <div className="divide-y divide-slate-100">
        {employeesWithIssues.map(emp => {
          const tracks = rowsByEmployee[emp.id] ?? [];
          const faltas = tracks.filter(t => isFalta(t)).length;
          return (
            <div key={emp.id} className="bg-white px-5 py-4 hover:bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-rose-500 to-pink-600 text-sm font-black text-white">{normalizeDisplayName(emp.name).charAt(0).toUpperCase()}</div>
                <div>
                  <p className="text-sm font-black text-slate-950">{normalizeDisplayName(emp.name)}</p>
                  <p className="text-[10px] font-semibold text-rose-600">{faltas} FALTA(S) • {emp.department || '-'}</p>
                </div>
              </div>
              <button onClick={() => onSelectEmployee(emp.id)} className="btn-outline inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[10px] font-black"><Eye size={12} /> VER</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OcorrenciasSection({ employee, tracks, monthFilter, canManage, canApprove, isRefreshing, removeLoading, onEdit, onDelete }: { employee: Employee; tracks: TimeTrack[]; monthFilter: string; canManage: boolean; canApprove: boolean; isRefreshing: boolean; removeLoading: boolean; onEdit: (r: TimeTrack) => void; onDelete: (r: TimeTrack) => void }) {
  const grid = useMemo(() => generateMonthGrid(monthFilter, employee, tracks), [monthFilter, employee, tracks]);
  const ocorrencias = grid.filter(d => !d.isRestDay && !d.isFuture && d.track && isFalta(d.track));

  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200/60 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-amber-50/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">{employee.registration || employee.id.slice(0, 8)}</span>
          <h3 className="text-sm font-black text-amber-900">{normalizeDisplayName(employee.name)}</h3>
        </div>
        <p className="mt-2 text-xs text-amber-700">{ocorrencias.length} ocorrência(s) no mês de {monthLabel(monthFilter)}</p>
      </div>
      {ocorrencias.length === 0 ? <div className="px-5 py-8 text-center text-sm font-semibold text-slate-400">Nenhuma ocorrência neste mês.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] table-fixed text-left">
            <thead><tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><th className="px-3 py-2 w-[18%]">Data</th><th className="px-3 py-2 w-[18%]">Status</th><th className="px-3 py-2 w-[18%]">Entrada</th><th className="px-3 py-2 w-[18%]">Saída</th><th className="px-3 py-2 w-[28%]">Ações</th></tr></thead>
            <tbody>
              {ocorrencias.map(day => {
                const t = day.track!;
                return (
                  <tr key={day.dateKey} className="border-t border-slate-100 text-[11px] font-semibold hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-500">{formatDateFull(day.dateKey)}</td>
                    <td className="px-3 py-2"><StatusBadge status="FALTA" /></td>
                    <td className="px-3 py-2 text-slate-300">--:--</td>
                    <td className="px-3 py-2 text-slate-300">--:--</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => onEdit(t)} disabled={isRefreshing || removeLoading} className="btn-outline-premium inline-flex h-6 items-center gap-1 px-2 text-[10px]"><Edit3 size={10} />SOLICITAR</button>
                        {canApprove && <button onClick={() => onEdit(t)} disabled={isRefreshing || removeLoading} className="crystal-button inline-flex h-6 items-center gap-1 px-2 text-[10px]"><Check size={10} />ACEITAR</button>}
                        {canManage && <button onClick={() => onDelete(t)} disabled={isRefreshing || removeLoading} className="inline-flex h-6 items-center gap-1 rounded-[6px] bg-rose-500 px-2 text-[10px] font-black text-white"><Trash2 size={10} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── STATUS BADGE ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();
  const colors: Record<string, string> = {
    'NORMAL': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'PENDENTE': 'bg-amber-50 text-amber-700 border-amber-200',
    'REJEITADO': 'bg-rose-50 text-rose-700 border-rose-200',
    'REVOGADO': 'bg-red-100 text-red-700 border-red-200',
    'FERIADO': 'bg-teal-50 text-teal-700 border-teal-200',
    'ATESTADO': 'bg-violet-50 text-violet-700 border-violet-200',
    'ATESTADO (HORAS)': 'bg-violet-50 text-violet-700 border-violet-200',
    'SUSPENSÃO': 'bg-orange-50 text-orange-700 border-orange-200',
    'FOLGA': 'bg-sky-50 text-sky-700 border-sky-200',
    'FOLGA (DSR)': 'bg-sky-50 text-sky-700 border-sky-200',
    'FOLGA EXTRA': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'FOLGA BANCO': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'AJUSTE MANUAL': 'bg-orange-50 text-orange-700 border-orange-200',
    'FALTA': 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return <span className={`inline-flex items-center rounded-[5px] border px-2 py-0.5 text-[9px] font-black whitespace-nowrap ${colors[upper] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{upper}</span>;
}

// ─── MANUAL TIME SHEET MODAL ──────────────────────────────────────────────

function ManualTimeSheetModal({ employees, employeesLoading, employeesError, defaultEmployeeId, track, bulk, onClose, onDone }: { employees: Employee[]; employeesLoading: boolean; employeesError: string | null; defaultEmployeeId: string; track?: TimeTrack; bulk?: boolean; onClose: () => void; onDone: () => void }) {
  const initialDate = track ? toDateKey(track.date) : new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<'single' | 'bulk'>(bulk ? 'bulk' : 'single');
  const [bulkMode, setBulkMode] = useState<'day' | 'period'>('day');
  const [employeeId, setEmployeeId] = useState(track?.employeeId ?? defaultEmployeeId);
  const initialEmployeeScale = employees.find(e => e.id === (track?.employeeId ?? defaultEmployeeId))?.workScale;
  const [date, setDate] = useState(initialDate);
  const [startDate, setStartDate] = useState(initialDate.slice(0, 8) + '01');
  const [endDate, setEndDate] = useState(initialDate);
  const [selectedBulkEmployees, setSelectedBulkEmployees] = useState<string[]>([]);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [entry, setEntry] = useState(track ? timeInput(track.entry) : '');
  const [lunchStart, setLunchStart] = useState(track ? timeInput(track.lunchStart) : '');
  const [lunchReturn, setLunchReturn] = useState(track ? timeInput(track.lunchReturn) : '');
  const [exit, setExit] = useState(track ? timeInput(track.exit) : '');
  const [reason, setReason] = useState<TimeTrackAdjustmentReason>('ajuste_erro_marcacao');
  const [detail, setDetail] = useState('');
  const initialCycle = defaultCycle(initialEmployeeScale);
  const [restDayMode, setRestDayMode] = useState<RestDayMode>('employee_scale');
  const [daysOff, setDaysOff] = useState<number[]>(defaultDaysOff(initialEmployeeScale));
  const [cycleStartDate, setCycleStartDate] = useState(initialDate.slice(0, 8) + '01');
  const [cycleWorkDays, setCycleWorkDays] = useState(initialCycle.workDays);
  const [cycleOffDays, setCycleOffDays] = useState(initialCycle.offDays);
  const selectedReason = ADJUSTMENT_REASONS.find(item => item.value === reason);
  const fullDay = Boolean(selectedReason?.fullDay);

  function applyEmployeeScaleDefaults(nextEmployeeId: string) { const emp = employees.find(item => item.id === nextEmployeeId); setDaysOff(defaultDaysOff(emp?.workScale)); const cycle = defaultCycle(emp?.workScale); setCycleWorkDays(cycle.workDays); setCycleOffDays(cycle.offDays); }
  function toggleDayOff(day: number) { setDaysOff(current => current.includes(day) ? current.filter(item => item !== day) : [...current, day].sort((a, b) => a - b)); }
  function toggleBulkEmployee(id: string) { setSelectedBulkEmployees(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]); }
  function selectAllEmployees() { const allIds = employees.map(e => e.id); setSelectedBulkEmployees(selectedBulkEmployees.length === allIds.length ? [] : allIds); }

  const save = useMutation(async () => {
    const payload = { entry: toIso(date, entry), lunchStart: toIso(date, lunchStart), lunchReturn: toIso(date, lunchReturn), exit: toIso(date, exit), reason, observation: detail };
    if (track) { await api.timeTrack.update(track.id, { entry: payload.entry, lunchStart: payload.lunchStart, lunchReturn: payload.lunchReturn, exit: payload.exit, observation: detail.trim() || track.observation || null }); return; }
    if (mode === 'bulk') {
      const employeeIds = bulkMode === 'period' ? [employeeId] : selectedBulkEmployees;
      const base = { employeeIds, entry: payload.entry, lunchStart: payload.lunchStart, lunchReturn: payload.lunchReturn, exit: payload.exit, reason, observation: detail, restDayMode, daysOff, cycleStartDate, cycleWorkDays, cycleOffDays };
      await api.timeTrack.manualBulk(bulkMode === 'period' ? { ...base, startDate, endDate } : { ...base, date });
      return;
    }
    await api.timeTrack.manual({ employeeId, date, ...payload });
  }, { onSuccess: onDone });

  const hasTime = fullDay || entry || lunchStart || lunchReturn || exit;
  const bulkValid = bulkMode === 'period' ? Boolean(employeeId && startDate && endDate && hasTime) : Boolean(selectedBulkEmployees.length && date && hasTime);
  const valid = mode === 'bulk' ? bulkValid : Boolean(employeeId && date && hasTime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-black text-slate-950">{track ? 'EDITAR PONTO' : mode === 'bulk' ? 'LANÇAR PONTO EM LOTE' : 'LANÇAR PONTO MANUAL'}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button></div>
        {(save.error || employeesError) && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{save.error || employeesError}</p>}
        {!track && <div className="mb-4 grid grid-cols-2 gap-2 rounded-[8px] bg-slate-100 p-1 text-xs font-black"><button type="button" onClick={() => setMode('single')} className={`h-9 rounded-[7px] ${mode === 'single' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>INDIVIDUAL</button><button type="button" onClick={() => setMode('bulk')} className={`h-9 rounded-[7px] ${mode === 'bulk' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>LOTE</button></div>}

        <div className="grid gap-3 sm:grid-cols-2">
          {mode === 'bulk' && !track ? (<>
            <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>TIPO DE LOTE</span><select value={bulkMode} onChange={e => setBulkMode(e.target.value as 'day' | 'period')} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"><option value="day">Um dia para vários colaboradores</option><option value="period">Período inteiro para um colaborador</option></select></label>
            {bulkMode === 'day' ? (
              <div className="sm:col-span-2 rounded-[10px] border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-700">SELECIONE OS FUNCIONÁRIOS ({selectedBulkEmployees.length})</span><button type="button" onClick={selectAllEmployees} className="text-[10px] font-bold text-teal-600 hover:text-teal-800">{selectedBulkEmployees.length === employees.length ? 'DESMARCAR TODOS' : 'SELECIONAR TODOS'}</button></div>
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {(showAllEmployees ? employees : employees.slice(0, 8)).map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-slate-50 cursor-pointer text-xs">
                      <input type="checkbox" checked={selectedBulkEmployees.includes(emp.id)} onChange={() => toggleBulkEmployee(emp.id)} className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                      <span className="font-semibold text-slate-700">{normalizeDisplayName(emp.name)}</span>
                      <span className="text-[10px] text-slate-400">{emp.registration || emp.id.slice(0, 8)}</span>
                    </label>
                  ))}
                </div>
                {employees.length > 8 && <button type="button" onClick={() => setShowAllEmployees(!showAllEmployees)} className="mt-1 text-[10px] font-bold text-teal-600">{showAllEmployees ? 'MOSTRAR MENOS' : `VER TODOS (${employees.length})`}</button>}
              </div>
            ) : <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>FUNCIONÁRIO</span><select value={employeeId} onChange={e => { setEmployeeId(e.target.value); applyEmployeeScaleDefaults(e.target.value); }} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"><option value="">Selecione...</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}</select></label>}
            {bulkMode === 'period' ? <><label className="space-y-1 text-xs font-medium text-slate-600"><span>DATA INICIAL</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label><label className="space-y-1 text-xs font-medium text-slate-600"><span>DATA FINAL</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label></> : <label className="space-y-1 text-xs font-medium text-slate-600"><span>DATA</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>}
          </>) : (<>
            <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>FUNCIONÁRIO</span><select disabled={Boolean(track)} value={employeeId} onChange={e => { setEmployeeId(e.target.value); applyEmployeeScaleDefaults(e.target.value); }} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"><option value="">{employeesLoading ? 'Carregando...' : 'Selecione...'}</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}</select></label>
            <label className="space-y-1 text-xs font-medium text-slate-600"><span>DATA</span><input disabled={Boolean(track)} type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50" /></label>
          </>)}
          {mode === 'bulk' && !track && (
            <section className="sm:col-span-2 rounded-[10px] border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-700">FOLGAS DA ESCALA SERÃO RESPEITADAS AUTOMATICAMENTE.</p>
            </section>
          )}
          {!track && <label className="space-y-1 text-xs font-medium text-slate-600"><span>MOTIVO DO AJUSTE</span><select value={reason} onChange={e => setReason(e.target.value as TimeTrackAdjustmentReason)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{ADJUSTMENT_REASONS.map(item => <option key={item.value} value={item.value}>{item.label.toUpperCase()}</option>)}</select></label>}
          {!fullDay && <><TimeField label="ENTRADA" value={entry} onChange={setEntry} /><TimeField label="SAÍDA ALMOÇO" value={lunchStart} onChange={setLunchStart} /><TimeField label="RETORNO ALMOÇO" value={lunchReturn} onChange={setLunchReturn} /><TimeField label="SAÍDA" value={exit} onChange={setExit} /></>}
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>OBSERVAÇÃO</span><input value={detail} onChange={e => setDetail(e.target.value)} placeholder={track ? track.observation ?? '' : selectedReason?.label} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        </div>
        {!employeesLoading && employees.length === 0 && <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Cadastre um funcionário ativo antes de lançar a folha de ponto.</p>}
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">CANCELAR</button><button onClick={() => valid && save.mutate().catch(() => {})} disabled={!valid || employees.length === 0 || save.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{save.loading ? 'SALVANDO...' : track ? 'SALVAR' : mode === 'bulk' ? 'LANÇAR LOTE' : 'LANÇAR'}</button></div>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="space-y-1 text-xs font-medium text-slate-600"><span>{label}</span><input type="time" value={value} onChange={e => onChange(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>;
}

// ─── MONTH GRID SECTION ───────────────────────────────────────────────────

function MonthGridSection({ employee, tracks, monthFilter, canManage, canApprove, isRefreshing, removeLoading, onEdit, onDelete, canDownload, reportCompany, companyLoading }: { employee: Employee; tracks: TimeTrack[]; monthFilter: string; canManage: boolean; canApprove: boolean; isRefreshing: boolean; removeLoading: boolean; onEdit: (row: TimeTrack) => void; onDelete: (row: TimeTrack) => void; canDownload: boolean; reportCompany: CompanyPrintInfo; companyLoading: boolean; }) {
  const grid = useMemo(() => generateMonthGrid(monthFilter, employee, tracks), [monthFilter, employee, tracks]);
  const workedTotal = sumMinutes(tracks, 'totalWorked');
  const balanceTotal = sumMinutes(tracks, 'dailyBalance');
  const restDaysCount = grid.filter(d => d.isRestDay).length;
  const workedDaysCount = grid.filter(d => d.track && !d.isRestDay).length;
  const missingDaysCount = grid.filter(d => !d.isRestDay && !d.isFuture && !d.track).length;

  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200/60 bg-white shadow-sm">
      {/* Cabeçalho */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white">{normalizeDisplayName(employee.name).charAt(0).toUpperCase()}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-teal-200/60 bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700">{employee.registration || employee.id.slice(0, 8).toUpperCase()}</span>
                <h3 className="text-sm font-black text-slate-950">{normalizeDisplayName(employee.name)}</h3>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span>{employee.department || '-'}</span><span className="text-slate-300">|</span>
                <span>{employee.position || '-'}</span><span className="text-slate-300">|</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px]">ESCALA: {employee.workScale || (employee.customWorkScale || '6X1')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 text-[10px] font-bold">
              <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-2.5 py-1"><span className="block text-[8px] uppercase text-slate-400">TRABALHADO</span><span className="text-slate-900">{formatMinutes(workedTotal)}</span></div>
              <div className={`rounded-[6px] border px-2.5 py-1 ${balanceTotal >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><span className="block text-[8px] uppercase text-slate-400">SALDO</span><span className={balanceTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatMinutes(balanceTotal)}</span></div>
            </div>
            {canDownload && <button onClick={() => openPrintableReport(tracks, monthFilter, reportCompany, employee)} disabled={tracks.length === 0 || companyLoading || isRefreshing} className="btn-outline-premium inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[10px] font-black disabled:opacity-50"><FileText size={12} /> FOLHA</button>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 rounded-[8px] border border-slate-100 bg-slate-50/50 px-3 py-2 text-[10px] font-semibold text-slate-600">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{workedDaysCount} BATIDA(S)</span><span className="text-slate-300">|</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" />{restDaysCount} FOLGA(S)</span>
          {missingDaysCount > 0 && <><span className="text-slate-300">|</span><span className="flex items-center gap-1 text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{missingDaysCount} PENDENTE(S)</span></>}
          <span className="text-slate-300 ml-auto">|</span><span className="text-slate-400">{monthLabel(monthFilter)}</span>
        </div>
      </div>

      {/* Grade mensal */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] table-fixed border-separate border-spacing-0 text-left">
          <thead>
            <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
              <th className="px-2 py-2 w-[15%] border-b border-slate-200">DATA</th>
              <th className="px-2 py-2 w-[9%] border-b border-slate-200">ENTRADA</th>
              <th className="px-2 py-2 w-[11%] border-b border-slate-200">ALMOÇO</th>
              <th className="px-2 py-2 w-[9%] border-b border-slate-200">SAÍDA</th>
              <th className="px-2 py-2 w-[9%] border-b border-slate-200">TRAB</th>
              <th className="px-2 py-2 w-[9%] border-b border-slate-200">SALDO</th>
              <th className="px-2 py-2 w-[8%] border-b border-slate-200">ABONO</th>
              <th className="px-2 py-2 w-[10%] border-b border-slate-200">STATUS</th>
              <th className="px-2 py-2 w-[20%] border-b border-slate-200 text-center">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {grid.map(day => {
              const t = day.track;
              let rowBg = '';
              if (day.isRestDay) rowBg = 'bg-sky-50/30';
              else if (day.isFuture) rowBg = 'bg-slate-50/40 opacity-70';
              else if (!t) rowBg = 'bg-amber-50/20';
              const dayStatusText = day.isRestDay ? restDayBadge() : t ? dayStatus(t) : day.isFuture ? '---' : 'FALTA';
              const isAtestado = dayStatusText.includes('ATESTADO') || dayStatusText.includes('FERIADO') || dayStatusText.includes('SUSPENSÃO');

              return (
                <tr key={day.dateKey} className={`h-9 border-t border-slate-100 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50/70 ${rowBg}`}>
                  <td className="px-2 truncate text-slate-500 text-[11px] font-bold" title={formatDateFull(day.dateKey)}>{formatDateFull(day.dateKey)}</td>
                  <td className={`px-2 truncate font-mono text-[11px] font-black ${t?.entry ? 'text-slate-950' : 'text-slate-300'}`}>{isAtestado ? '---' : t?.entry ? displayTime(t.entry) : '--:--'}</td>
                  <td className={`px-2 truncate font-mono text-[11px] ${t?.lunchStart || t?.lunchReturn ? 'text-slate-600' : 'text-slate-300'}`}>{isAtestado ? '---' : displayLunch(t?.lunchStart, t?.lunchReturn)}</td>
                  <td className={`px-2 truncate font-mono text-[11px] font-black ${t?.exit ? 'text-slate-950' : 'text-slate-300'}`}>{isAtestado ? '---' : t?.exit ? displayTime(t.exit) : '--:--'}</td>
                  <td className="px-2 truncate text-slate-600 text-[11px]">{t ? displayWorked(t.totalWorked) : '--:--'}</td>
                  <td className={`px-2 truncate text-[11px] font-black ${t && (t.dailyBalance ?? 0) < 0 ? 'text-rose-600' : t ? 'text-emerald-600' : 'text-slate-300'}`}>{t ? displayBalance(t.dailyBalance) : '--:--'}</td>
                  <td className="px-2 truncate text-slate-400 text-[11px]">--:--</td>
                  <td className="px-2 truncate text-center"><StatusBadge status={dayStatusText} /></td>
                  <td className="px-2 text-center">
                    <div className="flex justify-center gap-1 whitespace-nowrap">
                      {/* Todos podem solicitar ajuste */}
                      {!day.isRestDay && !day.isFuture && (
                        <button onClick={() => onEdit(t || { id: '', employeeId: employee.id, date: day.dateKey, entry: null, lunchStart: null, lunchReturn: null, exit: null, totalWorked: null, dailyBalance: null } as unknown as TimeTrack)} disabled={isRefreshing || removeLoading} className="btn-outline-premium inline-flex h-6 shrink-0 items-center gap-1 px-2 text-[9px] font-bold"><Edit3 size={10} />{t ? 'EDITAR' : 'SOLICITAR'}</button>
                      )}
                      {/* Gestor/RH/Admin podem aceitar ajuste pendente */}
                      {t && canApprove && t.manualStatus === 'pending' && (
                        <button onClick={() => onEdit(t)} disabled={isRefreshing || removeLoading} className="crystal-button inline-flex h-6 shrink-0 items-center gap-1 px-2 text-[9px] font-bold"><Check size={10} />ACEITAR</button>
                      )}
                      {/* Admin/RH podem excluir */}
                      {t && canManage && (
                        <button onClick={() => onDelete(t)} disabled={isRefreshing || removeLoading} className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[5px] bg-gradient-to-r from-rose-500 to-pink-600 px-2 text-[9px] font-black text-white"><Trash2 size={10} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5">
        <div className="flex flex-wrap gap-4 text-[9px] font-semibold text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border border-sky-200 bg-sky-50" /> FOLGA (DSR)</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border border-amber-200 bg-amber-50/40" /> PENDENTE</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border border-slate-200 bg-slate-50/40" /> FUTURO</span>
          <span className="flex items-center gap-1 text-slate-400">--:-- SEM REGISTRO</span>
        </div>
      </div>
    </section>
  );
}